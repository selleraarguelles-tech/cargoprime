import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/mail'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

function generarPasswordTemporal() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from(crypto.randomBytes(8))
    .map(b => chars[b % chars.length])
    .join('')
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Falta el email' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Siempre responder OK para no revelar si el email existe
    if (!user || !user.activo) {
      return NextResponse.json({ ok: true })
    }

    const tempPassword = generarPasswordTemporal()
    const hashed = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    })

    await sendPasswordResetEmail(user.email, user.nombre, tempPassword)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    // Error de configuración de email: dar mensaje útil
    if (msg.includes('ECONNREFUSED') || msg.includes('EAUTH') || msg.includes('invalid login') || msg.includes('Missing credentials')) {
      return NextResponse.json(
        { error: 'El servidor de correo no está configurado. Contacta con el administrador.' },
        { status: 503 }
      )
    }
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Error al enviar el correo. Inténtalo de nuevo.' }, { status: 500 })
  }
}
