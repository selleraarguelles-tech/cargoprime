import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ id: string }> }

// Un admin desactiva el 2FA de un usuario (p. ej. si pierde el móvil).
export async function POST(_req: Request, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  await prisma.user.update({
    where: { id: parseInt(id) },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  return NextResponse.json({ ok: true })
}
