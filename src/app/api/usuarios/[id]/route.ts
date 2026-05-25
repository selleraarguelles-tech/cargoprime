import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { id } = await params
    const { nombre, email, rol } = await req.json()
    if (!nombre || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { nombre, email, rol },
      select: { id: true, username: true, nombre: true, email: true, rol: true, activo: true },
    })

    return NextResponse.json(user)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'El email ya está en uso' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { id } = await params
    const { activo } = await req.json()

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { activo },
      select: { id: true, activo: true },
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
