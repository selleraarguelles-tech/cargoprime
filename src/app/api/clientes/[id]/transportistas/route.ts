import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ id: string }> }

const CANALES = ['amazon', 'tiktok', 'shopify']
const CARRIERS = ['ctt', 'cex']

// Guarda el transportista preferido por canal para un cliente.
// Body: { amazon: 'ctt'|'cex', tiktok: ..., shopify: ... }
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const clienteId = parseInt(id)
  const body = await req.json().catch(() => ({}))

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } })
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  await Promise.all(
    CANALES.filter(c => CARRIERS.includes(body[c])).map(canal =>
      prisma.preferenciaTransportista.upsert({
        where: { clienteId_canal: { clienteId, canal } },
        update: { transportista: body[canal] },
        create: { clienteId, canal, transportista: body[canal] },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
