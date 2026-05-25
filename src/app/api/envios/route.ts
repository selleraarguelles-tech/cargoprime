import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const envios = await prisma.envio.findMany({
    include: { cliente: { select: { nombre: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(envios)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { clienteId, transportista, trackingNumber, descripcion, fechaEsperada } = body

  if (!clienteId || !transportista || !trackingNumber) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const envio = await prisma.envio.create({
    data: {
      clienteId: Number(clienteId),
      transportista,
      trackingNumber: trackingNumber.trim(),
      descripcion: descripcion || null,
      fechaEsperada: fechaEsperada ? new Date(fechaEsperada) : null,
    },
    include: { cliente: { select: { nombre: true } } },
  })
  return NextResponse.json(envio, { status: 201 })
}
