import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { sendPasswordResetEmail } from '@/lib/mail'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

interface Params { params: Promise<{ id: string }> }

function generarPasswordTemporal() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from(crypto.randomBytes(8))
    .map(b => chars[b % chars.length])
    .join('')
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { id } = await params
    const { adminReset } = await req.json()

    const userId = parseInt(id)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const tempPassword = generarPasswordTemporal()
    const hashed = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    })

    await sendPasswordResetEmail(user.email, user.nombre, tempPassword)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('ECONNREFUSED') || msg.includes('EAUTH') || msg.includes('invalid login') || msg.includes('Missing credentials')) {
      return NextResponse.json(
        { error: 'El servidor de correo no está configurado. Configura SMTP en el archivo .env' },
        { status: 503 }
      )
    }
    console.error('[admin reset-password]', err)
    return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 })
  }
}
