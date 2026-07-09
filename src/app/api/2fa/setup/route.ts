import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generarSecret2FA, generarQR } from '@/lib/twofa'

// Genera un secreto nuevo y su QR para dar de alta el 2FA del usuario en sesión.
// El secreto se guarda pero el 2FA queda DESACTIVADO hasta confirmar un código (/activate).
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const userId = parseInt(session.user.id)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: 'El 2FA ya está activado' }, { status: 409 })
  }

  const secret = generarSecret2FA()
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  })

  const qr = await generarQR(user.email, secret)
  return NextResponse.json({ ok: true, qr, secret })
}
