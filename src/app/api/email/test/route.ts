import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import nodemailer from 'nodemailer'

// Diagnóstico de correo (solo admin). Abrir en el navegador logueado:
//   /api/email/test           -> dice si el SMTP está configurado y qué variables faltan
//   /api/email/test?to=TU@MAIL -> además intenta enviar un correo de prueba a esa dirección
export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const e = process["env"]
  const tiene = {
    SMTP_HOST: e.SMTP_HOST ? 'OK' : 'FALTA',
    SMTP_PORT: e.SMTP_PORT ?? '(sin definir, usa 587)',
    SMTP_SECURE: e.SMTP_SECURE ?? '(sin definir)',
    SMTP_USER: e.SMTP_USER ? 'OK' : 'FALTA',
    SMTP_PASS: e.SMTP_PASS ? 'OK' : 'FALTA',
    SMTP_FROM: e.SMTP_FROM ?? '(sin definir)',
  }
  const configurado = !!(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS)

  if (!configurado) {
    return NextResponse.json({
      configurado: false,
      motivo: 'Faltan variables SMTP en Vercel: por eso no sale ningún correo.',
      variables: tiene,
    })
  }

  const to = req.nextUrl.searchParams.get('to')
  if (!to) {
    return NextResponse.json({
      configurado: true,
      variables: tiene,
      nota: 'SMTP configurado. Añade ?to=tu@email.com a esta URL para enviar un correo de prueba.',
    })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: Number(e.SMTP_PORT ?? 587),
      secure: e.SMTP_SECURE === 'true',
      auth: { user: e.SMTP_USER, pass: e.SMTP_PASS },
    })
    await transporter.sendMail({
      from: e.SMTP_FROM ?? `CargoPrime <${e.SMTP_USER}>`,
      to,
      subject: 'Prueba de envío · CargoPrime',
      text: 'Si recibes esto, el SMTP de CargoPrime en producción funciona correctamente.',
    })
    return NextResponse.json({ configurado: true, enviado: true, to, variables: tiene })
  } catch (err) {
    return NextResponse.json({
      configurado: true,
      enviado: false,
      to,
      error: err instanceof Error ? err.message : String(err),
      variables: tiene,
    })
  }
}
