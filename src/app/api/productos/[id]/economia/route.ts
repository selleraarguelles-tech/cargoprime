import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ id: string }> }

// Guarda la economía de un producto (precio de venta, coste, comisión) para el P&L.
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const num = (v: unknown, def = 0) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : def
  }

  const producto = await prisma.producto.update({
    where: { id: parseInt(id) },
    data: {
      precioVenta: num(body.precioVenta),
      costeUnitario: num(body.costeUnitario),
      comisionAmazon: num(body.comisionAmazon, 15),
    },
    select: { id: true, precioVenta: true, costeUnitario: true, comisionAmazon: true },
  })

  return NextResponse.json(producto)
}
