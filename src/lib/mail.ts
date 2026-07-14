import nodemailer from 'nodemailer'
import { prisma } from './prisma'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from']

/**
 * Configuracion SMTP: primero la guardada en la base de datos (pagina Configuracion
 * de la app) y, si falta, las variables de entorno. Devuelve null si no hay lo esencial.
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  let db: Record<string, string> = {}
  try {
    const rows = await prisma.configuracion.findMany({ where: { clave: { in: SMTP_KEYS } } })
    db = Object.fromEntries(rows.map(r => [r.clave, r.valor]))
  } catch {
    // si la BD no responde, seguimos solo con el entorno
  }
  const e = process["env"]

  const host = db.smtp_host || e.SMTP_HOST || ''
  const user = db.smtp_user || e.SMTP_USER || ''
  const pass = db.smtp_pass || e.SMTP_PASS || ''
  if (!host || !user || !pass) return null

  const port = Number(db.smtp_port || e.SMTP_PORT || 587)
  const secureRaw = db.smtp_secure || e.SMTP_SECURE || (port === 465 ? 'true' : 'false')

  return {
    host,
    port,
    secure: secureRaw === 'true',
    user,
    pass,
    from: db.smtp_from || e.SMTP_FROM || `CargoPrime <${user}>`,
  }
}

async function getMailer(): Promise<{ transporter: ReturnType<typeof nodemailer.createTransport>; from: string }> {
  const cfg = await getSmtpConfig()
  if (!cfg) throw new Error('SMTP no configurado: rellena Correo (SMTP) en Configuracion')
  return {
    transporter: nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    }),
    from: cfg.from,
  }
}


export async function sendPasswordResetEmail(to: string, nombre: string, tempPassword: string) {

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

  const { transporter, from } = await getMailer()
  await transporter.sendMail({
    from,
    to,
    subject: '🔑 Tu contraseña temporal — Almacén FBM',
    html,
    text: `Hola ${nombre},\n\nTu contraseña temporal es: ${tempPassword}\n\nCámbiala desde Mi perfil → Cambiar contraseña después de iniciar sesión.\n\nAlmacén FBM`,
  })
}


export async function emailConfigurado(): Promise<boolean> {
  return (await getSmtpConfig()) !== null
}

export async function sendLowStockEmail(
  to: string,
  clienteNombre: string,
  productoNombre: string,
  sku: string,
  stockActual: number,
  stockMinimo: number
) {
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

  const { transporter, from } = await getMailer()
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

  const { transporter, from } = await getMailer()
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

export interface LineaRecepcion {
  sku: string
  nombre: string
  esperada: number
  recibida: number
}

/** Aviso al cliente: su mercancía ha sido recibida en el almacén (con desglose y discrepancias). */
export async function sendRecepcionEmail(
  to: string,
  clienteNombre: string,
  envioId: number,
  tracking: string,
  lineas: LineaRecepcion[]
) {
  const discrepancias = lineas.filter(l => l.recibida !== l.esperada)
  const filasHtml = lineas.map(l => {
    const dif = l.recibida - l.esperada
    const color = dif === 0 ? '#059669' : '#d97706'
    return `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-family: monospace; font-size: 12px;">${l.sku}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px;">${l.nombre}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right;">${l.esperada}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right; font-weight: bold;">${l.recibida}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; text-align: right; color: ${color}; font-weight: bold;">${dif === 0 ? 'OK' : (dif > 0 ? '+' + dif : dif)}</td>
    </tr>`
  }).join('')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
      ${cabeceraCargoPrime()}
      <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin: 0 0 16px;">Hola <strong>${clienteNombre}</strong>,</p>
        <p style="color: #374151; margin: 0 0 20px;">
          Hemos recibido tu mercancía en el almacén (envío entrante <strong>#${envioId}</strong>, seguimiento <span style="font-family: monospace;">${tracking}</span>). Este es el desglose:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
          <tr style="background: #f8fafc;">
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">SKU</th>
            <th style="padding: 6px 8px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Producto</th>
            <th style="padding: 6px 8px; text-align: right; font-size: 11px; color: #64748b; text-transform: uppercase;">Esperado</th>
            <th style="padding: 6px 8px; text-align: right; font-size: 11px; color: #64748b; text-transform: uppercase;">Recibido</th>
            <th style="padding: 6px 8px; text-align: right; font-size: 11px; color: #64748b; text-transform: uppercase;">Dif.</th>
          </tr>
          ${filasHtml}
        </table>
        ${discrepancias.length > 0
          ? `<p style="color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 13px; margin: 0 0 16px;">
              Hay <strong>${discrepancias.length}</strong> línea${discrepancias.length !== 1 ? 's' : ''} con diferencia entre lo esperado y lo recibido. Te recomendamos reclamarlo a tu proveedor o transitario cuanto antes.
            </p>`
          : `<p style="color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; font-size: 13px; margin: 0 0 16px;">
              Todo ha llegado según lo esperado. El stock ya está disponible para tus pedidos.
            </p>`}
        ${PIE_CARGOPRIME}
      </div>
    </div>`

  const { transporter, from } = await getMailer()
  await transporter.sendMail({
    from,
    to,
    subject: discrepancias.length > 0
      ? `Mercancía recibida con ${discrepancias.length} discrepancia${discrepancias.length !== 1 ? 's' : ''} - envío #${envioId}`
      : `Mercancía recibida correctamente - envío #${envioId}`,
    html,
    text: `Hola ${clienteNombre},\n\nHemos recibido tu mercancía (envío #${envioId}, seguimiento ${tracking}).\n\n` +
      lineas.map(l => `${l.sku} | ${l.nombre} | esperado ${l.esperada} | recibido ${l.recibida}`).join('\n') +
      (discrepancias.length > 0 ? `\n\nHay ${discrepancias.length} línea(s) con diferencias: reclama a tu proveedor o transitario.` : '\n\nTodo correcto.') +
      `\n\nCargoPrime | info@cargoprime.es`,
  })
}

/** Aviso al cliente: su envío entrante lleva +48h de retraso sobre la fecha esperada. */
export async function sendRetrasoEntranteEmail(
  to: string,
  clienteNombre: string,
  envioId: number,
  tracking: string,
  transportista: string,
  fechaEsperada: Date,
  horasRetraso: number
) {
  const fechaTxt = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(fechaEsperada)
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      ${cabeceraCargoPrime()}
      <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin: 0 0 16px;">Hola <strong>${clienteNombre}</strong>,</p>
        <p style="color: #111827; margin: 0 0 20px;">
          Tu envío entrante <strong>#${envioId}</strong> (${transportista}, seguimiento <span style="font-family: monospace;">${tracking}</span>)
          estaba previsto para el <strong>${fechaTxt}</strong> y todavía no lo hemos recibido en el almacén
          (<strong>${Math.floor(horasRetraso)} horas de retraso</strong>).
        </p>
        <p style="color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 13px; margin: 0 0 16px;">
          Te recomendamos <strong>contactar con tu transitario o proveedor</strong> para averiguar qué ha pasado y evitar quedarte sin stock.
        </p>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">Te avisaremos en cuanto la mercancía llegue y esté disponible.</p>
        ${PIE_CARGOPRIME}
      </div>
    </div>`

  const { transporter, from } = await getMailer()
  await transporter.sendMail({
    from,
    to,
    subject: `Tu envío entrante #${envioId} lleva +48h de retraso - avisa a tu transitario`,
    html,
    text: `Hola ${clienteNombre},\n\nTu envío entrante #${envioId} (${transportista}, seguimiento ${tracking}) estaba previsto para el ${fechaTxt} y aún no lo hemos recibido (${Math.floor(horasRetraso)}h de retraso).\n\nTe recomendamos contactar con tu transitario o proveedor.\n\nCargoPrime | info@cargoprime.es`,
  })
}

/** Reclamacion individual a CTT Express por un envio sin entregar tras +36h. */
export async function sendReclamacionCTT(to: string, cc: string, d: DatosReclamacion) {

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      ${cabeceraCargoPrime()}
      <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin: 0 0 16px;">Buenas,</p>
        <p style="color: #111827; margin: 0 0 20px; font-size: 15px;">
          El siguiente envio lleva <strong>mas de 36 horas expedido y sigue sin entregarse</strong>:
        </p>
        <table style="width: 100%; font-size: 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 0 0 20px;">
          <tr><td style="padding: 6px 12px; color: #6b7280;">Numero de envio</td><td style="padding: 6px 12px; font-family: monospace; font-weight: bold;">${d.tracking}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Referencia</td><td style="padding: 6px 12px; font-family: monospace;">${d.referencia}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Expedido</td><td style="padding: 6px 12px;">${d.expedido}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Ultimo estado</td><td style="padding: 6px 12px; font-weight: bold; color: #dc2626;">${d.estadoActual}</td></tr>
          <tr><td style="padding: 6px 12px; color: #6b7280;">Destino</td><td style="padding: 6px 12px;">${d.destino}</td></tr>
        </table>
        <p style="color: #111827; margin: 0 0 8px;">Necesitamos que nos indiqueis <strong>hoy mismo</strong>:</p>
        <ol style="color: #111827; margin: 0 0 20px; padding-left: 20px;">
          <li style="margin-bottom: 4px;">El motivo del retraso.</li>
          <li>La fecha y franja prevista de entrega o del siguiente intento.</li>
        </ol>
        <p style="color: #374151; margin: 0;">Responded a <strong>info@cargoprime.es</strong>.</p>
        ${PIE_CARGOPRIME}
      </div>
    </div>`

  const { transporter, from } = await getMailer()
  await transporter.sendMail({
    from,
    to,
    cc,
    replyTo: 'info@cargoprime.es',
    subject: `URGENTE: Envio ${d.tracking} sin entregar - +36h desde expedicion`,
    html,
    text: `Buenas,\n\nEl siguiente envio lleva mas de 36 horas expedido y sigue sin entregarse:\n\nNumero de envio: ${d.tracking}\nReferencia: ${d.referencia}\nExpedido: ${d.expedido}\nUltimo estado: ${d.estadoActual}\nDestino: ${d.destino}\n\nNecesitamos que nos indiqueis hoy mismo:\n1. El motivo del retraso.\n2. La fecha y franja prevista de entrega o del siguiente intento.\n\nResponded a info@cargoprime.es.\n\nCargoPrime, S.L. | Logistica de calidad | 692 38 33 53`,
  })
}
