import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Comprueba email+contraseña SIN crear sesión, solo para saber si el login
// necesita un segundo paso con código 2FA. La verificación real del código y
// la creación de sesión las hace NextAuth (authorize) en el submit final.
export async function POST(req: NextRequest) {
  let email = ''
  let password = ''
  try {
    const body = await req.json()
    email = String(body.email ?? '')
    password = String(body.password ?? '')
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.activo) {
    return NextResponse.json({ ok: false })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ ok: false })
  }

  return NextResponse.json({ ok: true, needs2fa: user.twoFactorEnabled })
}
