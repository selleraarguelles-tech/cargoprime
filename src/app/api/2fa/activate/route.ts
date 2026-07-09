import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verificarCodigo } from '@/lib/twofa'

// Confirma el alta: verifica el primer código contra el secreto guardado y activa el 2FA.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { code } = await req.json().catch(() => ({ code: '' }))
  if (!code) return NextResponse.json({ error: 'Falta el código' }, { status: 400 })

  const userId = parseInt(session.user.id)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: 'Primero genera el código QR' }, { status: 400 })
  }

  if (!verificarCodigo(String(code), user.twoFactorSecret)) {
    return NextResponse.json({ error: 'Código incorrecto. Revisa la hora de tu móvil e inténtalo de nuevo.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  })

  return NextResponse.json({ ok: true })
}
