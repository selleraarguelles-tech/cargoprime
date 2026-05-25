import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTracking } from '@/lib/transportistas'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const envio = await prisma.envio.findUnique({ where: { id: Number(id) } })
  if (!envio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const result = await getTracking(envio.transportista, envio.trackingNumber)

  await prisma.envio.update({
    where: { id: envio.id },
    data: {
      estado: result.estado,
      ultimoEvento: result.ultimoEvento,
      ultimaRevision: new Date(),
    },
  })

  return NextResponse.json(result)
}
