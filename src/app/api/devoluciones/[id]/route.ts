import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ id: string }> }

const ESTADOS = ['solicitada', 'recibida', 'reembolsada', 'rechazada']

// Cambia el estado de una devolución. Si se marca "recibida" con reingresar=true,
// devuelve la unidad al stock del producto (una sola vez) y registra el movimiento.
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const devId = parseInt(id)
  const { estado, reingresar } = await req.json().catch(() => ({}))
  if (!ESTADOS.includes(estado)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })

  const dev = await prisma.devolucion.findUnique({ where: { id: devId }, include: { pedido: true } })
  if (!dev) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const debeReingresar = estado === 'recibida' && reingresar === true && !dev.reingresado

  if (debeReingresar) {
    await prisma.$transaction([
      prisma.producto.update({ where: { id: dev.pedido.productoId }, data: { stockActual: { increment: 1 } } }),
      prisma.movimientoStock.create({
        data: { productoId: dev.pedido.productoId, tipo: 'entrada', cantidad: 1, nota: `Devolución pedido ${dev.pedido.amazonOrderId}` },
      }),
      prisma.devolucion.update({
        where: { id: devId },
        data: { estado, reingresado: true, recibidaAt: new Date() },
      }),
    ])
  } else {
    await prisma.devolucion.update({
      where: { id: devId },
      data: { estado, ...(estado === 'recibida' && !dev.recibidaAt ? { recibidaAt: new Date() } : {}) },
    })
  }

  return NextResponse.json({ ok: true })
}

// Borra una devolución (solo si aún no reingresó stock, para no descuadrar inventario).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const dev = await prisma.devolucion.findUnique({ where: { id: parseInt(id) }, select: { reingresado: true } })
  if (!dev) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (dev.reingresado) return NextResponse.json({ error: 'No se puede borrar: ya reingresó stock' }, { status: 400 })

  await prisma.devolucion.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
