import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verificarCodigo } from '@/lib/twofa'

// Desactiva el 2FA del usuario en sesión. Exige un código válido para evitar
// que alguien con la sesión abierta lo quite sin tener el dispositivo.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { code } = await req.json().catch(() => ({ code: '' }))
  const userId = parseInt(session.user.id)
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: 'El 2FA no está activado' }, { status: 400 })
  }

  if (!code || !verificarCodigo(String(code), user.twoFactorSecret)) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  return NextResponse.json({ ok: true })
}
