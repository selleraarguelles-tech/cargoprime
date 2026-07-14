import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Últimas notificaciones + contador de no leídas (staff del panel interno).
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role === 'seller') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const [items, noLeidas] = await Promise.all([
    prisma.notificacion.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
    prisma.notificacion.count({ where: { leidaAt: null } }),
  ])

  return NextResponse.json({ items, noLeidas })
}

// Marca notificaciones como leídas. Body: { todas: true } o { ids: number[] }
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role === 'seller') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  if (body.todas === true) {
    await prisma.notificacion.updateMany({ where: { leidaAt: null }, data: { leidaAt: new Date() } })
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await prisma.notificacion.updateMany({
      where: { id: { in: body.ids.map((n: unknown) => parseInt(String(n))) }, leidaAt: null },
      data: { leidaAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
