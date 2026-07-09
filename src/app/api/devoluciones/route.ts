import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Crea una devolución a partir del nº de pedido (amazonOrderId).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { amazonOrderId, motivo } = await req.json().catch(() => ({}))
  if (!amazonOrderId) return NextResponse.json({ error: 'Falta el nº de pedido' }, { status: 400 })

  const pedido = await prisma.pedido.findUnique({ where: { amazonOrderId: String(amazonOrderId).trim() } })
  if (!pedido) return NextResponse.json({ error: 'No existe ningún pedido con ese número' }, { status: 404 })

  const devolucion = await prisma.devolucion.create({
    data: {
      pedidoId: pedido.id,
      clienteId: pedido.clienteId,
      motivo: motivo ? String(motivo) : null,
    },
  })

  return NextResponse.json(devolucion, { status: 201 })
}
