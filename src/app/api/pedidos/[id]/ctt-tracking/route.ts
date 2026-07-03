import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCTTTracking } from '@/lib/ctt'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const pedido = await prisma.pedido.findUnique({ where: { id: parseInt(id) } })
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (!pedido.trackingNumber) {
    return NextResponse.json({ error: 'Este pedido no tiene número de seguimiento' }, { status: 400 })
  }

  try {
    const result = await getCTTTracking(pedido.trackingNumber)
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { trackingEstado: result.estado },
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
