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


export function emailConfigurado(): boolean {
  const e = process["env"]
  return !!(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS)
}

export async function sendLowStockEmail(
  to: string,
  clienteNombre: string,
  productoNombre: string,
  sku: string,
  stockActual: number,
  stockMinimo: number
) {
  const from = process["env"].SMTP_FROM ?? 'CargoPrime <no-reply@cargoprime.es>'
  const agotado = stockActual === 0

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <div style="background: #0d1526; padding: 22px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #e0b437; margin: 0; font-size: 20px;">CargoPrime</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Logistica de calidad</p>
      </div>
      <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin: 0 0 16px;">Hola <strong>${clienteNombre}</strong>,</p>
        <p style="color: #374151; margin: 0 0 20px;">
          Te avisamos de que uno de tus productos ha alcanzado el <strong>stock minimo</strong> en el almacen.
          Te recomendamos reponer existencias para no quedarte sin stock.
        </p>
        <div style="background: ${agotado ? '#fef2f2' : '#fff7ed'}; border: 1px solid ${agotado ? '#fecaca' : '#fed7aa'}; border-radius: 8px; padding: 18px; margin: 0 0 20px;">
          <p style="font-size: 15px; font-weight: bold; color: #111827; margin: 0 0 6px;">${productoNombre}</p>
          <p style="font-family: monospace; font-size: 12px; color: #6b7280; margin: 0 0 12px;">SKU: ${sku}</p>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #6b7280;">Stock actual</td>
              <td style="text-align: right; font-weight: bold; color: ${agotado ? '#dc2626' : '#ea580c'};">${stockActual} ud.${agotado ? ' (agotado)' : ''}</td>
            </tr>
            <tr>
              <td style="color: #6b7280;">Stock minimo</td>
              <td style="text-align: right; color: #374151;">${stockMinimo} ud.</td>
            </tr>
          </table>
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
          Aviso automatico de CargoPrime | info@cargoprime.es | 692 38 33 53
        </p>
      </div>
    </div>
  `

  const transporter = createTransporter()
  await transporter.sendMail({
    from,
    to,
    subject: `Stock ${agotado ? 'agotado' : 'bajo minimos'}: ${productoNombre}`,
    html,
    text: `Hola ${clienteNombre},\n\nTu producto "${productoNombre}" (SKU ${sku}) ha alcanzado el stock minimo.\nStock actual: ${stockActual} ud.\nStock minimo: ${stockMinimo} ud.\n\nTe recomendamos reponer existencias.\n\nCargoPrime | info@cargoprime.es`,
  })
}


export interface FilaRetraso {
  pedido: string
  cliente: string
  tracking: string
  estadoActual: string
  horas: number
  destino: string
}

const PIE_CARGOPRIME = `
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
          CargoPrime, S.L. | Logistica de calidad | info@cargoprime.es | 692 38 33 53
        </p>`

function cabeceraCargoPrime(): string {
  return `
      <div style="background: #0d1526; padding: 22px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #e0b437; margin: 0; font-size: 20px;">CargoPrime</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Logistica de calidad</p>
      </div>`
}

/** Resumen interno diario de envios con mas de 36h sin entregar. */
export async function sendResumenRetrasos(to: string, filas: FilaRetraso[]) {
  const from = process["env"].SMTP_FROM ?? 'CargoPrime <no-reply@cargoprime.es>'
  const fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date())

  const filasHtml = filas.map(f => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-family: monospace; font-size: 12px;">${f.pedido}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">${f.cliente}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-family: monospace; font-size: 11px;">${f.tracking}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">${f.estadoActual}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #dc2626; font-weight: bold;">${f.horas}h</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">${f.destino}</td>
    </tr>`).join('')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
      ${cabeceraCargoPrime()}
      <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin: 0 0 16px;">Hola equipo,</p>
        <p style="color: #374151; margin: 0 0 20px;">
          Estos <strong>${filas.length}</strong> envios superan las <strong>36 horas</strong> desde su expedicion sin confirmacion de entrega:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
          <tr style="background: #f8fafc;">
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Pedido</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Cliente</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Tracking</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Estado</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Horas</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Destino</th>
          </tr>
          ${filasHtml}
        </table>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">
          Se envia una reclamacion individual a CTT Express por cada envio que aun no habia sido reclamado.
          Panel: <a href="https://cargoprime-three.vercel.app/seguimiento?retraso=1" style="color: #ea580c;">Seguimiento</a>.
        </p>
        ${PIE_CARGOPRIME}
      </div>
    </div>`

  const transporter = createTransporter()
  await transporter.sendMail({
    from,
    to,
    subject: `AVISO: ${filas.length} envio${filas.length !== 1 ? 's' : ''} con mas de 36h sin entregar - ${fecha}`,
    html,
    text: `Envios con mas de 36h sin entregar (${fecha}):\n\n` + filas.map(f => `${f.pedido} | ${f.cliente} | ${f.tracking} | ${f.estadoActual} | ${f.horas}h | ${f.destino}`).join('\n'),
  })
}

export interface DatosReclamacion {
  tracking: string
  referencia: string
  expedido: string
  estadoActual: string
  destino: string
}

/** Reclamacion individual a CTT Express por un envio sin entregar tras +36h. */
export async function sendReclamacionCTT(to: string, cc: string, d: DatosReclamacion) {
  const from = process["env"].SMTP_FROM ?? 'CargoPrime <no-reply@cargoprime.es>'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      ${cabeceraCargoPrime()}
      <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin: 0 0 16px;">Buenas,</p>
        <p style="color: #374151; margin: 0 0 20px;">
          Somos <strong>CargoPrime, S.L.</strong> (codigo de cliente <strong>4671400001</strong>).
          Os escribimos en relacion con el siguiente envio, que supera las <strong>36 horas</strong> desde su
          expedicion sin que conste la entrega:
        </p>
        <table style="width: 100%; font-size: 14px; background: #f8fafc; border-radius: 8px; padding: 8px; margin: 0 0 20px;">
          <tr><td style="padding: 6px 12px; color: #6b7280;">Numero de envio</td><td style="padding: 6px 12px; font-family: monospace; font-weight: bold;">${d.tracking}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Referencia del pedido</td><td style="padding: 6px 12px; font-family: monospace;">${d.referencia}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Fecha de expedicion</td><td style="padding: 6px 12px;">${d.expedido}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Ultimo estado registrado</td><td style="padding: 6px 12px; font-weight: bold; color: #ea580c;">${d.estadoActual}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Destino</td><td style="padding: 6px 12px;">${d.destino}</td></tr>
        </table>
        <p style="color: #374151; margin: 0 0 16px;">
          Podeis indicarnos el <strong>motivo por el que no se ha entregado</strong> y cuando esta prevista
          la entrega o el siguiente intento?
        </p>
        <p style="color: #374151; margin: 0;">Quedamos a la espera de vuestra respuesta. Gracias.</p>
        <p style="color: #374151; margin: 16px 0 0;">Un saludo,<br/><strong>CargoPrime, S.L.</strong> | Logistica de calidad</p>
        ${PIE_CARGOPRIME}
      </div>
    </div>`

  const transporter = createTransporter()
  await transporter.sendMail({
    from,
    to,
    cc,
    subject: `Consulta estado de envio ${d.tracking} - sin entrega tras +36h (cliente 4671400001)`,
    html,
    text: `Buenas,\n\nSomos CargoPrime, S.L. (codigo de cliente 4671400001). El siguiente envio supera las 36 horas desde su expedicion sin que conste la entrega:\n\nNumero de envio: ${d.tracking}\nReferencia: ${d.referencia}\nFecha de expedicion: ${d.expedido}\nUltimo estado: ${d.estadoActual}\nDestino: ${d.destino}\n\nPodeis indicarnos el motivo por el que no se ha entregado y cuando esta prevista la entrega o el siguiente intento?\n\nGracias. Un saludo,\nCargoPrime, S.L. | info@cargoprime.es | 692 38 33 53`,
  })
}
