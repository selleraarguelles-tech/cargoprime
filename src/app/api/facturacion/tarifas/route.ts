import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Guarda (upsert) la tarifa de un cliente.
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.clienteId) return NextResponse.json({ error: 'Falta clienteId' }, { status: 400 })

  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  const data = {
    cuotaMensual: num(body.cuotaMensual),
    tarifaPedido: num(body.tarifaPedido),
    tarifaRecepcion: num(body.tarifaRecepcion),
    tarifaUnidadAlmacen: num(body.tarifaUnidadAlmacen),
    iva: Number.isFinite(Number(body.iva)) ? Number(body.iva) : 21,
  }

  const rc = await prisma.rateCard.upsert({
    where: { clienteId: Number(body.clienteId) },
    update: data,
    create: { clienteId: Number(body.clienteId), ...data },
  })

  return NextResponse.json(rc)
}
