import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ id: string }> }

const ESTADOS = ['borrador', 'emitida', 'pagada']

// Cambia el estado de una factura (borrador → emitida → pagada).
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const { estado } = await req.json().catch(() => ({ estado: '' }))
  if (!ESTADOS.includes(estado)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })

  const factura = await prisma.factura.update({
    where: { id: parseInt(id) },
    data: { estado },
    select: { id: true, estado: true },
  })
  return NextResponse.json(factura)
}

// Borra una factura en borrador.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const factura = await prisma.factura.findUnique({ where: { id: parseInt(id) }, select: { estado: true } })
  if (!factura) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (factura.estado !== 'borrador') return NextResponse.json({ error: 'Solo se pueden borrar facturas en borrador' }, { status: 400 })

  await prisma.factura.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
