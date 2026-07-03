import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const cuentas = await prisma.cuentaTikTok.findMany({
    orderBy: { createdAt: 'desc' },
    include: { cliente: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(
    cuentas.map(c => ({
      id: c.id,
      nombre: c.nombre,
      shopId: c.shopId,
      clienteId: c.clienteId,
      clienteNombre: c.cliente.nombre,
      activo: c.activo,
      createdAt: c.createdAt.toISOString(),
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { nombre, shopId, shopCipher, clienteId, accessToken, refreshToken } = await req.json()

  if (!nombre || !shopId || !clienteId || !accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: parseInt(clienteId) } })
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const existing = await prisma.cuentaTikTok.findUnique({ where: { shopId } })
  if (existing) {
    return NextResponse.json({ error: `Shop ID ya registrado (cuenta: "${existing.nombre}")` }, { status: 409 })
  }

  try {
    const cuenta = await prisma.cuentaTikTok.create({
      data: { nombre, shopId, shopCipher, clienteId: parseInt(clienteId), accessToken, refreshToken },
    })
    return NextResponse.json({ ok: true, id: cuenta.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/tiktok/cuentas]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await req.json()
  await prisma.cuentaTikTok.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
