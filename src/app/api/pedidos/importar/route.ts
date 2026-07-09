import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const maxDuration = 120

// Parser CSV robusto (comillas, delimitador , ; o tabulador autodetectado)
function parseCsv(text: string): string[][] {
  const nl = text.indexOf('\n')
  const firstLine = nl >= 0 ? text.slice(0, nl) : text
  const nComa = (firstLine.match(/,/g) ?? []).length
  const nPunto = (firstLine.match(/;/g) ?? []).length
  const nTab = (firstLine.match(/\t/g) ?? []).length
  const delim = nTab > nComa && nTab > nPunto ? '\t' : nPunto > nComa ? ';' : ','

  const rows: string[][] = []
  let row: string[] = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === delim) { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

// Alias de columnas (TikTok Shop + genérico), en minúsculas
const CAMPOS: Record<string, string[]> = {
  orderId: ['order id', 'order_id', 'order number', 'nº de pedido', 'n° de pedido', 'numero de pedido', 'pedido', 'id de pedido', 'id pedido'],
  nombre: ['recipient', 'buyer name', 'name', 'nombre del destinatario', 'destinatario', 'nombre', 'cliente'],
  direccion: ['detail address', 'street name', 'address', 'shipping address', 'dirección', 'direccion', 'domicilio'],
  cp: ['zipcode', 'zip code', 'postal code', 'zip', 'código postal', 'codigo postal', 'cp'],
  ciudad: ['city', 'town', 'ciudad', 'localidad', 'población', 'poblacion'],
  pais: ['country', 'país', 'pais'],
  producto: ['product name', 'item name', 'sku name', 'producto', 'nombre del producto', 'artículo', 'articulo', 'título', 'titulo'],
  sku: ['seller sku', 'seller_sku', 'sku', 'referencia', 'ref'],
  cantidad: ['quantity', 'qty', 'cantidad'],
}

function mapearColumnas(headers: string[]): Record<string, number> {
  const norm = headers.map(h => h.trim().toLowerCase())
  const idx: Record<string, number> = {}
  for (const [campo, alias] of Object.entries(CAMPOS)) {
    const i = norm.findIndex(h => alias.some(a => h === a || h.includes(a)))
    if (i >= 0) idx[campo] = i
  }
  return idx
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  const clienteId = parseInt(String(form.get('clienteId') ?? ''))
  const canal = String(form.get('canal') ?? 'tiktok')

  if (!file) return NextResponse.json({ error: 'Falta el archivo CSV' }, { status: 400 })
  if (!clienteId) return NextResponse.json({ error: 'Selecciona un cliente' }, { status: 400 })

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length < 2) return NextResponse.json({ error: 'El archivo no tiene filas de datos' }, { status: 400 })

  const idx = mapearColumnas(rows[0])
  if (idx.orderId === undefined) {
    return NextResponse.json({ error: 'No se encontró la columna del número de pedido. Revisa que el archivo tenga cabeceras (Order ID / Nº de pedido).' }, { status: 400 })
  }

  const val = (r: string[], campo: string) => (idx[campo] !== undefined ? (r[idx[campo]] ?? '').trim() : '')

  let creados = 0, omitidos = 0
  const errores: string[] = []
  const vistos = new Set<string>()

  for (const r of rows.slice(1)) {
    const orderId = val(r, 'orderId')
    if (!orderId) { omitidos++; continue }
    if (vistos.has(orderId)) { omitidos++; continue } // misma orden en varias líneas (varios items)
    vistos.add(orderId)

    try {
      const existe = await prisma.pedido.findUnique({ where: { amazonOrderId: orderId } })
      if (existe) { omitidos++; continue }

      const skuRaw = val(r, 'sku')
      const nombreProd = val(r, 'producto') || 'Producto importado'
      const sku = skuRaw || `${canal.toUpperCase()}-${orderId}`

      const producto = await prisma.producto.upsert({
        where: { sku },
        update: {},
        create: { sku, nombre: nombreProd.slice(0, 100), clienteId, stockActual: 0 },
      })

      await prisma.pedido.create({
        data: {
          amazonOrderId: orderId,
          canal,
          clienteId,
          productoId: producto.id,
          destinatarioNombre: val(r, 'nombre') || 'Sin nombre',
          destinatarioDireccion: val(r, 'direccion') || 'Sin dirección',
          destinatarioCP: val(r, 'cp'),
          destinatarioCiudad: val(r, 'ciudad'),
          destinatarioPais: val(r, 'pais') || 'ES',
          estado: 'sin_etiqueta',
        },
      })
      creados++
    } catch (e: unknown) {
      errores.push(`${orderId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({ ok: true, total: vistos.size, creados, omitidos, errores: errores.slice(0, 10) })
}
