import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createCexShipment } from '@/lib/correosExpress'

export const maxDuration = 60

interface Params { params: Promise<{ id: string }> }

// Graba el envío en Correos Express y devuelve la etiqueta PDF.
// Igual que ctt-label: guarda tracking, marca preparando y arranca el reloj de entrega.
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
    const { numEnvio, pdf } = await createCexShipment({
      ...pedido,
      productoNombre: pedido.producto?.nombre ?? null,
      productoSku: pedido.producto?.sku ?? null,
    })

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        trackingNumber: numEnvio,
        transportista: 'Correos Express',
        estado: pedido.estado === 'sin_etiqueta' ? 'preparando' : pedido.estado,
        enviadoAt: new Date(), // arranca el reloj de entrega (+36h) al generar la etiqueta
      },
    })

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etiqueta-cex-${pedido.amazonOrderId}.pdf"`,
        'X-CEX-Tracking': numEnvio,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cex-label]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
