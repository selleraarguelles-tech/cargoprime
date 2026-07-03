import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCTTTracking, getCTTTrackingByReference } from '@/lib/ctt'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const pedido = await prisma.pedido.findUnique({ where: { id: parseInt(id) } })
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  try {
    if (pedido.trackingNumber) {
      const result = await getCTTTracking(pedido.trackingNumber)
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: { trackingEstado: result.estado },
      })
      return NextResponse.json(result)
    }

    // Sin número de seguimiento guardado: se busca por la referencia (pedido de Amazon)
    const encontrado = await getCTTTrackingByReference(pedido.amazonOrderId, pedido.createdAt)
    if (!encontrado) {
      return NextResponse.json({ error: 'No se ha encontrado ningún envío en CTT para este pedido' }, { status: 404 })
    }

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        trackingNumber: encontrado.shippingCode,
        transportista: 'CTT Express',
        trackingEstado: encontrado.estado,
        estado: 'enviado',
      },
    })

    return NextResponse.json({ estado: encontrado.estado, entregado: encontrado.entregado })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
