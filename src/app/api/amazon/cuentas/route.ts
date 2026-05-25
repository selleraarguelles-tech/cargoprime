import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const cuentas = await prisma.cuentaAmazon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { cliente: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(
    cuentas.map(c => ({
      id: c.id,
      nombre: c.nombre,
      sellerId: c.sellerId,
      marketplaceId: c.marketplaceId,
      clienteId: c.clienteId,
      clienteNombre: c.cliente.nombre,
      activo: c.activo,
      isSandbox: c.isSandbox,
      createdAt: c.createdAt.toISOString(),
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { nombre, sellerId, marketplaceId, clienteId, refreshToken, isSandbox } = await req.json()

  if (!nombre || !sellerId || !marketplaceId || !clienteId || !refreshToken) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: parseInt(clienteId) } })
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const existing = await prisma.cuentaAmazon.findUnique({ where: { sellerId } })
  if (existing) {
    return NextResponse.json({ error: `Seller ID ya registrado (cuenta: "${existing.nombre}"). Usa el botón editar para modificarla.` }, { status: 409 })
  }

  try {
    const cuenta = await prisma.cuentaAmazon.create({
      data: { nombre, sellerId, marketplaceId, clienteId: parseInt(clienteId), refreshToken, isSandbox: !!isSandbox },
    })
    return NextResponse.json({ ok: true, id: cuenta.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/amazon/cuentas]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id, nombre, sellerId, marketplaceId, clienteId, refreshToken, isSandbox } = await req.json()

  if (!id || !nombre || !sellerId || !marketplaceId || !clienteId) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const duplicate = await prisma.cuentaAmazon.findFirst({
    where: { sellerId, NOT: { id: parseInt(id) } },
  })
  if (duplicate) {
    return NextResponse.json({ error: `Seller ID ya usado por otra cuenta ("${duplicate.nombre}")` }, { status: 409 })
  }

  const data: Record<string, unknown> = {
    nombre,
    sellerId,
    marketplaceId,
    clienteId: parseInt(clienteId),
    isSandbox: !!isSandbox,
  }
  if (refreshToken?.trim()) data.refreshToken = refreshToken.trim()

  try {
    const cuenta = await prisma.cuentaAmazon.update({
      where: { id: parseInt(id) },
      data,
    })
    return NextResponse.json({ ok: true, id: cuenta.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[PUT /api/amazon/cuentas]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await req.json()
  await prisma.cuentaAmazon.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
