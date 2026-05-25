import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendPasswordResetEmail(to: string, nombre: string, tempPassword: string) {
  const from = process.env.SMTP_FROM ?? 'Almacén FBM <no-reply@almacen.local>'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #f97316; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🏭 Almacén FBM</h1>
      </div>
      <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin: 0 0 16px;">Hola <strong>${nombre}</strong>,</p>
        <p style="color: #374151; margin: 0 0 20px;">
          Se ha generado una contraseña temporal para tu cuenta. Úsala para iniciar sesión y cámbiala desde tu perfil.
        </p>
        <div style="background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 20px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">TU CONTRASEÑA TEMPORAL</p>
          <p style="font-family: monospace; font-size: 24px; font-weight: bold; color: #ea580c; margin: 0; letter-spacing: 2px;">${tempPassword}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px;">
          Por seguridad, cambia esta contraseña en cuanto inicies sesión desde <strong>Mi perfil → Cambiar contraseña</strong>.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
          Si no solicitaste este cambio, ignora este correo o contacta con el administrador.
        </p>
      </div>
    </div>
  `

  const transporter = createTransporter()
  await transporter.sendMail({
    from,
    to,
    subject: '🔑 Tu contraseña temporal — Almacén FBM',
    html,
    text: `Hola ${nombre},\n\nTu contraseña temporal es: ${tempPassword}\n\nCámbiala desde Mi perfil → Cambiar contraseña después de iniciar sesión.\n\nAlmacén FBM`,
  })
}
