import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { id } = await params
    const { estado, trackingNumber, transportista } = await req.json()

    const data: Record<string, unknown> = {}
    if (estado) data.estado = estado
    if (estado === 'enviado') data.enviadoAt = new Date() // arranca el reloj de entrega (+36h)
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber
    if (transportista !== undefined) data.transportista = transportista

    const pedido = await prisma.pedido.update({ where: { id: parseInt(id) }, data })
    return NextResponse.json(pedido)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { id } = await params
    await prisma.pedido.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar pedido' }, { status: 500 })
  }
}
