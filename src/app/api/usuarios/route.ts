import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { username, nombre, email, rol, password } = await req.json()
    if (!username || !nombre || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, nombre, email, rol: rol || 'readonly', password: hashed },
    })

    const { password: _, ...userSafe } = user
    return NextResponse.json(userSafe, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'El usuario o email ya existe' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
