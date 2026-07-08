import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createCTTShipment, getCTTLabel } from '@/lib/ctt'
import { PDFDocument } from 'pdf-lib'

export const maxDuration = 300

// Genera las etiquetas CTT de varios pedidos en un único PDF, agrupadas por producto.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { pedidoIds } = await req.json()
  if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) {
    return NextResponse.json({ error: 'pedidoIds requerido' }, { status: 400 })
  }
  if (pedidoIds.length > 50) {
    return NextResponse.json({ error: 'Máximo 50 etiquetas por lote' }, { status: 400 })
  }

  const pedidos = await prisma.pedido.findMany({
    where: { id: { in: pedidoIds.map((n: unknown) => parseInt(String(n))) } },
    include: { producto: { select: { nombre: true, sku: true } } },
    orderBy: [{ productoId: 'asc' }, { id: 'asc' }], // agrupadas por producto
  })
  if (pedidos.length === 0) return NextResponse.json({ error: 'Pedidos no encontrados' }, { status: 404 })

  const merged = await PDFDocument.create()
  const errores: string[] = []
  let generadas = 0

  for (const pedido of pedidos) {
    try {
      const shippingCode = await createCTTShipment({
        ...pedido,
        productoNombre: pedido.producto?.nombre ?? null,
        productoSku: pedido.producto?.sku ?? null,
      })
      const pdf = await getCTTLabel(shippingCode)

      await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          trackingNumber: shippingCode,
          transportista: 'CTT Express',
          estado: pedido.estado === 'sin_etiqueta' ? 'preparando' : pedido.estado,
          enviadoAt: new Date(), // arranca el reloj de entrega (+36h) al generar la etiqueta
        },
      })

      const src = await PDFDocument.load(pdf)
      const pages = await merged.copyPages(src, src.getPageIndices())
      pages.forEach(p => merged.addPage(p))
      generadas++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errores.push(`${pedido.amazonOrderId}: ${msg}`)
    }
  }

  if (generadas === 0) {
    return NextResponse.json(
      { error: 'No se pudo generar ninguna etiqueta', errores: errores.slice(0, 10) },
      { status: 500 }
    )
  }

  const bytes = await merged.save()
  const fecha = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(new Date())
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="etiquetas-lote-${fecha}.pdf"`,
      'X-Lote-Generadas': String(generadas),
      'X-Lote-Errores': String(errores.length),
    },
  })
}
