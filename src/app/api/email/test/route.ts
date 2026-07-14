import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import nodemailer from 'nodemailer'
import { getSmtpConfig } from '@/lib/mail'

// Diagnóstico de correo (solo admin):
//   /api/email/test              -> dice si el SMTP está configurado (BD o entorno)
//   /api/email/test?to=TU@MAIL   -> además envía un correo de prueba a esa dirección
export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const cfg = await getSmtpConfig()
  if (!cfg) {
    return NextResponse.json({
      configurado: false,
      motivo: 'SMTP sin configurar. Ve a Configuración → Correo (SMTP) dentro de la app y rellena los datos.',
    })
  }

  const to = req.nextUrl.searchParams.get('to')
  if (!to) {
    return NextResponse.json({
      configurado: true,
      host: cfg.host,
      puerto: cfg.port,
      usuario: cfg.user,
      nota: 'SMTP configurado. Añade ?to=tu@email.com a esta URL para enviar un correo de prueba.',
    })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    })
    await transporter.sendMail({
      from: cfg.from,
      to,
      subject: 'Prueba de envío · CargoPrime',
      text: 'Si recibes esto, el correo de CargoPrime funciona correctamente.',
    })
    return NextResponse.json({ configurado: true, enviado: true, to })
  } catch (err) {
    return NextResponse.json({
      configurado: true,
      enviado: false,
      to,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
