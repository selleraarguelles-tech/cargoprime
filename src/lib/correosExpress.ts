import { prisma } from './prisma'
import { getConfig } from './config'

// ============================================================
// Correos Express (CEX) — grabación de envíos, etiqueta y seguimiento
// Docs: DC_SP_WS_GrabacionEnviosRest_v03.19 y apiRestSeguimientoEnviosk8s_v01.06
// Autenticación: HTTP Basic (usuario/contraseña del WS).
// ============================================================

const URLS = {
  produccion: {
    grabacion: 'https://www.cexpr.es/wspsc/apiRestGrabacionEnviok8s/json/grabacionEnvio',
    seguimiento: 'https://www.cexpr.es/wspsc/apiRestSeguimientoEnviosk8s/json/seguimientoEnvio',
  },
  test: {
    grabacion: 'https://www.test.cexpr.es/wspsc/apiRestGrabacionEnviok8s/json/grabacionEnvio',
    seguimiento: 'https://www.test.cexpr.es/wspsc/apiRestSeguimientoEnviosk8s/json/seguimientoEnvio',
  },
}

export interface CexConfig {
  usuario: string
  password: string
  solicitante: string
  codigoCliente: string
  producto: string
  sandbox: boolean
  // Remitente: se reutilizan los datos de almacén ya configurados para CTT
  senderName: string
  senderAddress: string
  senderPostalCode: string
  senderTown: string
  senderCountryCode: string
  senderPhone: string
  senderEmail: string
}

export async function getCexConfig(): Promise<CexConfig | null> {
  const [usuario, password, solicitante, codigoCliente, producto, sandbox,
    senderName, senderAddress, senderPostalCode, senderTown, senderCountryCode, senderPhone, senderEmail] =
    await Promise.all([
      getConfig('cex_usuario'),
      getConfig('cex_password'),
      getConfig('cex_solicitante'),
      getConfig('cex_codigo_cliente'),
      getConfig('cex_producto'),
      getConfig('cex_sandbox'),
      getConfig('ctt_sender_name'),
      getConfig('ctt_sender_address'),
      getConfig('ctt_sender_postal_code'),
      getConfig('ctt_sender_town'),
      getConfig('ctt_sender_country_code'),
      getConfig('ctt_sender_phone'),
      getConfig('ctt_sender_email'),
    ])

  if (!usuario || !password || !solicitante) return null
  if (!senderName || !senderAddress || !senderPostalCode || !senderTown) return null

  return {
    usuario,
    password,
    solicitante,
    codigoCliente: codigoCliente ?? '',
    producto: producto || '63', // PAQ 24 por defecto
    sandbox: sandbox === 'true',
    senderName,
    senderAddress,
    senderPostalCode,
    senderTown,
    senderCountryCode: senderCountryCode || 'ES',
    senderPhone: senderPhone ?? '',
    senderEmail: senderEmail ?? '',
  }
}

function basicAuth(cfg: CexConfig): string {
  return 'Basic ' + Buffer.from(`${cfg.usuario}:${cfg.password}`).toString('base64')
}

function fechaHoyCex(): string {
  // DDMMYYYY en hora de Madrid
  const iso = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(new Date()) // YYYY-MM-DD
  const [y, m, d] = iso.split('-')
  return `${d}${m}${y}`
}

interface PedidoForCex {
  amazonOrderId: string
  destinatarioNombre: string
  destinatarioDireccion: string
  destinatarioCP: string
  destinatarioCiudad: string
  destinatarioPais: string
  peso: number | null
  productoNombre: string | null
  productoSku: string | null
}

/**
 * Graba un envío en Correos Express y devuelve el número de envío y la etiqueta PDF.
 * La etiqueta llega en la misma respuesta (base64, codificación única).
 */
export async function createCexShipment(pedido: PedidoForCex): Promise<{ numEnvio: string; pdf: Buffer }> {
  const cfg = await getCexConfig()
  if (!cfg) throw new Error('Correos Express no está configurado: rellena credenciales en Configuración y los datos del almacén (remitente)')

  const urls = cfg.sandbox ? URLS.test : URLS.produccion

  const body = {
    solicitante: cfg.solicitante,
    canalEntrada: '',
    numEnvio: '',
    ref: pedido.amazonOrderId.slice(0, 30),
    refCliente: (pedido.productoSku ?? '').slice(0, 30),
    fecha: fechaHoyCex(),
    codRte: cfg.codigoCliente,
    nomRte: cfg.senderName.slice(0, 40),
    nifRte: '',
    dirRte: cfg.senderAddress.slice(0, 300),
    pobRte: cfg.senderTown.slice(0, 40),
    codPosNacRte: cfg.senderPostalCode,
    paisISORte: cfg.senderCountryCode,
    codPosIntRte: '',
    contacRte: cfg.senderName.slice(0, 40),
    telefRte: cfg.senderPhone.slice(0, 15),
    emailRte: cfg.senderEmail.slice(0, 75),
    codDest: '',
    nomDest: pedido.destinatarioNombre.slice(0, 40),
    nifDest: '',
    dirDest: (pedido.destinatarioDireccion || 'Sin dirección').slice(0, 300),
    pobDest: pedido.destinatarioCiudad.slice(0, 40),
    codPosNacDest: pedido.destinatarioCP,
    paisISODest: pedido.destinatarioPais && pedido.destinatarioPais !== 'España' ? pedido.destinatarioPais : 'ES',
    codPosIntDest: '',
    contacDest: pedido.destinatarioNombre.slice(0, 40),
    // El teléfono del destinatario es obligatorio para CEX; Amazon no lo da sin RDT,
    // así que se usa el del almacén como contacto de respaldo.
    telefDest: (cfg.senderPhone || '600000000').slice(0, 15),
    emailDest: '',
    contacOtrs: '',
    telefOtrs: '',
    emailOtrs: '',
    observac: (pedido.productoNombre ?? '').slice(0, 80),
    numBultos: '1',
    kilos: String(pedido.peso ?? 1),
    volumen: '',
    alto: '',
    largo: '',
    ancho: '',
    producto: cfg.producto,
    portes: 'P',
    reembolso: '',
    entrSabado: '',
    seguro: '',
    numEnvioVuelta: '',
    listaBultos: [
      {
        alto: '', ancho: '', codBultoCli: '', codUnico: '',
        descripcion: (pedido.productoNombre ?? '').slice(0, 40),
        kilos: '', largo: '', observaciones: '', orden: '1',
        referencia: pedido.amazonOrderId.slice(0, 20), volumen: '',
      },
    ],
    listaInformacionAdicional: [
      {
        tipoEtiqueta: '1',        // PDF en base64
        etiquetaPDF: 'N',
        codificacionUnicaB64: '1', // base64 una sola vez
      },
    ],
  }

  const res = await fetch(urls.grabacion, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: basicAuth(cfg) },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Correos Express (${res.status}): ${txt.slice(0, 300)}`)
  }

  const data = await res.json()
  const codigo = Number(data.codigoRetorno)
  if (codigo !== 0) {
    throw new Error(`Correos Express [${data.codigoRetorno}]: ${data.mensajeRetorno || 'error al grabar el envío'}`)
  }

  const numEnvio = String(data.datosResultado ?? '').trim()
  if (!numEnvio) throw new Error('Correos Express no devolvió número de envío')

  // La etiqueta viene como lista de objetos; el PDF es el valor largo en base64
  let b64 = ''
  for (const item of (data.etiqueta ?? []) as Record<string, string>[]) {
    for (const v of Object.values(item)) {
      if (typeof v === 'string' && v.length > 500) { b64 = v; break }
    }
    if (b64) break
  }
  if (!b64) throw new Error('Envío grabado pero Correos Express no devolvió la etiqueta PDF')

  let pdf = Buffer.from(b64, 'base64')
  // Por si el servicio devuelve doble codificación pese a pedir única
  if (!pdf.subarray(0, 5).toString('latin1').startsWith('%PDF')) {
    const second = Buffer.from(pdf.toString('latin1'), 'base64')
    if (second.subarray(0, 5).toString('latin1').startsWith('%PDF')) pdf = second
  }

  return { numEnvio, pdf }
}

// --- Seguimiento ---

export const CEX_FINALES = new Set(['Entregado', 'Devolución'])

/** Normaliza la descripción de estado de CEX a las etiquetas que ya usa la app. */
function normalizarEstadoCex(desc: string): string {
  const d = desc.toUpperCase()
  if (d.includes('ENTREG')) return 'Entregado'
  if (d.includes('REPARTO')) return 'En reparto'
  if (d.includes('DEVOL') || d.includes('RETORNO')) return 'Devolución'
  if (d.includes('INCIDEN') || d.includes('AUSENTE') || d.includes('RECHAZ') || d.includes('FALLID')) return 'Reparto fallido'
  if (d.includes('TRANSITO') || d.includes('TRÁNSITO') || d.includes('RUTA') || d.includes('ADMITID') || d.includes('RECOGID') || d.includes('CLASIFIC')) return 'En tránsito'
  if (d.includes('GRABAD')) return 'Manifestado o grabado'
  // Estado desconocido: se guarda tal cual (capitalizado)
  return desc.charAt(0).toUpperCase() + desc.slice(1).toLowerCase()
}

function parseFechaCex(fecha?: string, hora?: string): Date | null {
  // fechaEstado DDMMAAAA + horaEstado HHMMSS (o HHMM)
  if (!fecha || fecha.length !== 8) return null
  const d = Number(fecha.slice(0, 2)), m = Number(fecha.slice(2, 4)), y = Number(fecha.slice(4))
  if (!y || !m || !d) return null
  const hh = hora && hora.length >= 2 ? Number(hora.slice(0, 2)) : 12
  const mm = hora && hora.length >= 4 ? Number(hora.slice(2, 4)) : 0
  const date = new Date(y, m - 1, d, hh, mm)
  return isNaN(date.getTime()) ? null : date
}

export interface CexTrackingInfo {
  estado: string          // normalizado a las etiquetas de la app
  estadoRaw: string       // descripción original de CEX
  entregadoEn: Date | null
}

/** Consulta el estado de un envío en Correos Express por su número de envío. */
export async function getCexTracking(numEnvio: string): Promise<CexTrackingInfo | null> {
  const cfg = await getCexConfig()
  if (!cfg) return null

  const urls = cfg.sandbox ? URLS.test : URLS.produccion
  // El WS de seguimiento espera el código de cliente numérico
  const codigoCliente = cfg.codigoCliente.replace(/\D/g, '') || cfg.codigoCliente

  const res = await fetch(urls.seguimiento, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: basicAuth(cfg) },
    body: JSON.stringify({ codigoCliente, dato: numEnvio, idioma: 'ES' }),
  })
  if (!res.ok) throw new Error(`Seguimiento CEX (${res.status})`)

  const data = await res.json()
  if (Number(data.error) !== 0) {
    // 409 = envío no encontrado para este cliente
    if (Number(data.error) === 409) return { estado: 'No encontrado en CEX', estadoRaw: data.mensajeError ?? '', entregadoEn: null }
    throw new Error(`Seguimiento CEX [${data.error}]: ${data.mensajeError ?? ''}`)
  }

  interface EstadoCex { codEstado?: string; descEstado?: string; fechaEstado?: string; horaEstado?: string }
  const estados: EstadoCex[] = data.estadoEnvios ?? []
  const ultimo = estados.length ? estados[estados.length - 1] : null
  const desc = ultimo?.descEstado || data.descEstado || ''
  if (!desc) return null

  const estado = normalizarEstadoCex(desc)
  let entregadoEn: Date | null = null
  if (estado === 'Entregado') {
    const ev = [...estados].reverse().find(e => (e.descEstado ?? '').toUpperCase().includes('ENTREG'))
    entregadoEn = parseFechaCex(ev?.fechaEstado, ev?.horaEstado) ?? new Date()
  }

  return { estado, estadoRaw: desc, entregadoEn }
}

/**
 * Refresca el estado de los envíos Correos Express aún en curso (no finales).
 * Espejo de refreshCttTrackingPendientes para CEX.
 */
export async function refreshCexTrackingPendientes(): Promise<{ revisados: number; actualizados: number; errores: number }> {
  const cfg = await getCexConfig()
  if (!cfg) return { revisados: 0, actualizados: 0, errores: 0 }

  const pendientes = await prisma.pedido.findMany({
    where: {
      transportista: 'Correos Express',
      trackingNumber: { not: null },
      OR: [{ trackingEstado: null }, { trackingEstado: { notIn: [...CEX_FINALES, 'No encontrado en CEX'] } }],
    },
    orderBy: { enviadoAt: 'asc' },
    take: 100,
    select: { id: true, trackingNumber: true, trackingEstado: true },
  })

  let actualizados = 0
  let errores = 0
  for (const p of pendientes) {
    try {
      const info = await getCexTracking(p.trackingNumber!)
      if (info && info.estado !== p.trackingEstado) {
        await prisma.pedido.update({
          where: { id: p.id },
          data: {
            trackingEstado: info.estado,
            ...(info.entregadoEn ? { entregadoAt: info.entregadoEn } : {}),
          },
        })
        actualizados++
      }
    } catch (e) {
      errores++
      console.error('[cex-tracking]', p.trackingNumber, e instanceof Error ? e.message : e)
    }
  }

  return { revisados: pendientes.length, actualizados, errores }
}
