import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createCTTShipment, getCTTLabel } from '@/lib/ctt'

export const maxDuration = 60

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const pedido = await prisma.pedido.findUnique({
    where: { id: parseInt(id) },
    include: { producto: { select: { nombre: true, sku: true } } },
  })
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

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

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etiqueta-${pedido.amazonOrderId}.pdf"`,
        'X-CTT-Tracking': shippingCode,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ctt-label]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
