import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { emailConfigurado, sendRecepcionEmail } from '@/lib/mail'

interface Params { params: Promise<{ id: string }> }

// Recibe el envío entrante: guarda las cantidades reales por línea,
// da entrada al stock (con movimiento trazado) y marca el envío como recibido.
// Body: { lineas: [{ lineaId, cantidadRecibida }] }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const envioId = parseInt(id)
  const body = await req.json().catch(() => ({}))
  const entradas: { lineaId: number; cantidadRecibida: number }[] = Array.isArray(body.lineas)
    ? body.lineas.map((l: { lineaId: unknown; cantidadRecibida: unknown }) => ({
        lineaId: parseInt(String(l.lineaId)),
        cantidadRecibida: parseInt(String(l.cantidadRecibida)),
      }))
    : []

  const envio = await prisma.envio.findUnique({
    where: { id: envioId },
    include: {
      cliente: { select: { nombre: true, email: true } },
      lineas: { include: { producto: { select: { id: true, sku: true, nombre: true } } } },
    },
  })
  if (!envio) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })
  if (envio.recibidoAt) return NextResponse.json({ error: 'Este envío ya fue recibido' }, { status: 400 })
  if (envio.lineas.length === 0) return NextResponse.json({ error: 'Añade al menos una línea antes de recibir' }, { status: 400 })

  const porLinea = new Map(entradas.map(e => [e.lineaId, e.cantidadRecibida]))

  // Validar que llegan todas las líneas con cantidades válidas (0 permitido = no llegó)
  for (const linea of envio.lineas) {
    const rec = porLinea.get(linea.id)
    if (rec === undefined || !Number.isFinite(rec) || rec < 0) {
      return NextResponse.json({ error: `Falta la cantidad recibida de ${linea.producto.sku}` }, { status: 400 })
    }
  }

  await prisma.$transaction([
    // Actualizar cada línea con lo recibido
    ...envio.lineas.map(linea =>
      prisma.envioLinea.update({
        where: { id: linea.id },
        data: { cantidadRecibida: porLinea.get(linea.id)! },
      })
    ),
    // Entrada a stock + movimiento por cada línea con unidades recibidas
    ...envio.lineas.flatMap(linea => {
      const rec = porLinea.get(linea.id)!
      if (rec <= 0) return []
      return [
        prisma.producto.update({
          where: { id: linea.productoId },
          data: { stockActual: { increment: rec } },
        }),
        prisma.movimientoStock.create({
          data: { productoId: linea.productoId, tipo: 'entrada', cantidad: rec, nota: `Recepción envío entrante #${envioId}` },
        }),
      ]
    }),
    prisma.envio.update({
      where: { id: envioId },
      data: { estado: 'recibido', recibidoAt: new Date() },
    }),
  ])

  const discrepancias = envio.lineas.filter(l => porLinea.get(l.id)! !== l.cantidadEsperada).length

  // Aviso al cliente con el desglose de lo recibido (best-effort: no rompe la recepción)
  let emailEnviado = false
  if (envio.cliente.email && (await emailConfigurado())) {
    try {
      await sendRecepcionEmail(
        envio.cliente.email,
        envio.cliente.nombre,
        envioId,
        envio.trackingNumber,
        envio.lineas.map(l => ({
          sku: l.producto.sku,
          nombre: l.producto.nombre,
          esperada: l.cantidadEsperada,
          recibida: porLinea.get(l.id)!,
        }))
      )
      emailEnviado = true
    } catch (e) {
      console.error('[recibir] fallo email de recepción:', e instanceof Error ? e.message : e)
    }
  }

  return NextResponse.json({ ok: true, lineas: envio.lineas.length, discrepancias, emailEnviado })
}
