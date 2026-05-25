import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { id } = await params
    const { nombre, email, telefono } = await req.json()
    if (!nombre || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
    }
    const cliente = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: { nombre, email, telefono: telefono || null },
    })
    return NextResponse.json(cliente)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { id } = await params
    const clienteId = parseInt(id)

    const pedidos = await prisma.pedido.count({ where: { clienteId } })
    if (pedidos > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${pedidos} pedido${pedidos !== 1 ? 's' : ''} asociado${pedidos !== 1 ? 's' : ''}` },
        { status: 409 }
      )
    }

    await prisma.producto.deleteMany({ where: { clienteId } })
    await prisma.cliente.delete({ where: { id: clienteId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
  }
}
