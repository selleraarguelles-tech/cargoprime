import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { productoId, cantidad, tipo, nota } = await req.json()
    if (!productoId || !cantidad) {
      return NextResponse.json({ error: 'Producto y cantidad son obligatorios' }, { status: 400 })
    }

    const qty = parseInt(cantidad)
    const tipoMovimiento = tipo || 'entrada'

    await prisma.movimientoStock.create({
      data: { productoId: parseInt(productoId), tipo: tipoMovimiento, cantidad: qty, nota: nota || null },
    })

    const updated = await prisma.producto.update({
      where: { id: parseInt(productoId) },
      data: { stockActual: tipoMovimiento === 'entrada' ? { increment: qty } : { decrement: qty } },
    })

    return NextResponse.json(updated, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al registrar movimiento de stock' }, { status: 500 })
  }
}
