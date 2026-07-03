import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyShopifyStore } from '@/lib/shopify'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const cuentas = await prisma.cuentaShopify.findMany({
    orderBy: { createdAt: 'desc' },
    include: { cliente: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(
    cuentas.map(c => ({
      id: c.id,
      nombre: c.nombre,
      shopDomain: c.shopDomain,
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

  const { nombre, shopDomain, clienteId, accessToken } = await req.json()

  if (!nombre || !shopDomain || !clienteId || !accessToken) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: parseInt(clienteId) } })
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const existing = await prisma.cuentaShopify.findUnique({ where: { shopDomain } })
  if (existing) {
    return NextResponse.json({ error: `Tienda ya registrada (cuenta: "${existing.nombre}")` }, { status: 409 })
  }

  try {
    await verifyShopifyStore(shopDomain, accessToken)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `No se pudo verificar la tienda: ${msg}` }, { status: 400 })
  }

  try {
    const cuenta = await prisma.cuentaShopify.create({
      data: { nombre, shopDomain, clienteId: parseInt(clienteId), accessToken },
    })
    return NextResponse.json({ ok: true, id: cuenta.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/shopify/cuentas]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await req.json()
  await prisma.cuentaShopify.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
