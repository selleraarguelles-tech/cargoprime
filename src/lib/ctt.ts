import { prisma } from './prisma'

const CTT_SCOPE = 'urn:com:ctt-express:integration-clients:scopes:common/ALL'

function getCTTUrls(sandbox: boolean) {
  return {
    authUrl: sandbox
      ? 'https://es-ctt-uat-integration-clients-pool-ids.auth.eu-west-1.amazoncognito.com/oauth2/token'
      : 'https://es-ctt-integration-clients-pool-ids.auth.eu-central-1.amazoncognito.com/oauth2/token',
    apiBase: sandbox
      ? 'https://api-test.cttexpress.com'
      : 'https://api.cttexpress.com',
  }
}

interface CTTConfig {
  clientId: string
  clientSecret: string
  username: string
  password: string
  clientCenterCode: string
  sandbox: boolean
  senderName: string
  senderAddress: string
  senderPostalCode: string
  senderTown: string
  senderCountryCode: string
  senderEmail: string
  senderPhone: string
}

export async function getCTTConfig(): Promise<CTTConfig> {
  const keys = [
    'ctt_client_id', 'ctt_client_secret', 'ctt_username', 'ctt_password',
    'ctt_client_center_code', 'ctt_sandbox',
    'ctt_sender_name', 'ctt_sender_address', 'ctt_sender_postal_code',
    'ctt_sender_town', 'ctt_sender_country_code', 'ctt_sender_email', 'ctt_sender_phone',
  ]
  const rows = await prisma.configuracion.findMany({ where: { clave: { in: keys } } })
  const c: Record<string, string> = {}
  rows.forEach(r => { c[r.clave] = r.valor })

  if (!c.ctt_client_id || !c.ctt_client_secret) {
    throw new Error('CTT Express no configurado. Ve a Configuración → CTT Express.')
  }

  return {
    clientId: c.ctt_client_id,
    clientSecret: c.ctt_client_secret,
    username: c.ctt_username ?? '',
    password: c.ctt_password ?? '',
    clientCenterCode: c.ctt_client_center_code ?? '',
    sandbox: c.ctt_sandbox !== 'false',
    senderName: c.ctt_sender_name ?? '',
    senderAddress: c.ctt_sender_address ?? '',
    senderPostalCode: c.ctt_sender_postal_code ?? '',
    senderTown: c.ctt_sender_town ?? '',
    senderCountryCode: c.ctt_sender_country_code ?? 'ES',
    senderEmail: c.ctt_sender_email ?? '',
    senderPhone: c.ctt_sender_phone ?? '',
  }
}

async function fetchNewToken(cfg: CTTConfig): Promise<{ token: string; expires: string }> {
  const { authUrl } = getCTTUrls(cfg.sandbox)
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: CTT_SCOPE,
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`CTT auth (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const expiresIn: number = data.expires_in ?? 86400
  return {
    token: data.access_token,
    expires: new Date(Date.now() + (expiresIn - 300) * 1000).toISOString(),
  }
}

export async function getCTTToken(): Promise<{ token: string; cfg: CTTConfig }> {
  const cfg = await getCTTConfig()

  const [tokenRow, expiresRow] = await Promise.all([
    prisma.configuracion.findUnique({ where: { clave: 'ctt_token' } }),
    prisma.configuracion.findUnique({ where: { clave: 'ctt_token_expires' } }),
  ])

  if (tokenRow?.valor && expiresRow?.valor) {
    if (new Date(expiresRow.valor) > new Date(Date.now() + 5 * 60 * 1000)) {
      return { token: tokenRow.valor, cfg }
    }
  }

  const { token, expires } = await fetchNewToken(cfg)
  await Promise.all([
    prisma.configuracion.upsert({ where: { clave: 'ctt_token' }, update: { valor: token }, create: { clave: 'ctt_token', valor: token } }),
    prisma.configuracion.upsert({ where: { clave: 'ctt_token_expires' }, update: { valor: expires }, create: { clave: 'ctt_token_expires', valor: expires } }),
  ])

  return { token, cfg }
}

function cttHeaders(token: string, cfg: CTTConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'user_name': cfg.username,
    'password': cfg.password,
  }
}

interface PedidoForCTT {
  amazonOrderId: string
  destinatarioNombre: string
  destinatarioDireccion: string
  destinatarioCP: string
  destinatarioCiudad: string
  destinatarioPais: string
  peso: number | null
  productoNombre?: string | null
  productoSku?: string | null
}

export async function createCTTShipment(pedido: PedidoForCTT): Promise<string> {
  const { token, cfg } = await getCTTToken()
  const { apiBase } = getCTTUrls(cfg.sandbox)

  const body = {
    client_center_code: cfg.clientCenterCode,
    shipping_type_code: 'C24',
    client_references: [
      pedido.amazonOrderId.slice(0, 50),
      (pedido.productoNombre ?? '').slice(0, 100),
    ],
    shipping_weight_declared: pedido.peso ?? 1,
    item_count: 1,
    sender_name: cfg.senderName,
    sender_country_code: cfg.senderCountryCode,
    sender_postal_code: cfg.senderPostalCode,
    sender_address: cfg.senderAddress,
    sender_town: cfg.senderTown,
    ...(cfg.senderEmail && { sender_email_notify_address: cfg.senderEmail }),
    ...(cfg.senderPhone && { sender_phones: [cfg.senderPhone] }),
    recipient_name: pedido.destinatarioNombre,
    recipient_country_code: pedido.destinatarioPais,
    recipient_postal_code: pedido.destinatarioCP,
    recipient_address: pedido.destinatarioDireccion || 'Sin dirección',
    recipient_town: pedido.destinatarioCiudad,
    shipping_date: new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(new Date()),
    items: [{
      item_weight_declared: pedido.peso ?? 1,
      item_length_declared: 0,
      item_width_declared: 0,
      item_height_declared: 0,
      ...(pedido.productoSku && { item_comments: pedido.productoSku.slice(0, 100) }),
    }],
  }

  const res = await fetch(`${apiBase}/integrations/manifest/v2.0/shippings`, {
    method: 'POST',
    headers: cttHeaders(token, cfg),
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`CTT shipment (${res.status}): ${await res.text()}`)

  const data = await res.json()
  // CTT returns the shipping code in various possible fields
  const shippingCode: string =
    data.shipping_data?.shipping_code ??
    data.shipping_code ?? data.shippingCode ?? data.code ?? data.data?.shipping_code ?? ''
  if (!shippingCode) {
    console.error('[ctt] unexpected shipment response:', JSON.stringify(data))
    throw new Error('CTT no devolvió código de envío. Respuesta: ' + JSON.stringify(data).slice(0, 200))
  }

  return shippingCode
}

interface CTTTrackingEvent {
  code: string
  description: string
  type: string
  event_date: string
}

export interface CTTTrackingResult {
  estado: string
  entregado: boolean
  fechaEntrega?: string
  ultimoEvento?: string
  eventos: CTTTrackingEvent[]
}

// Tabla oficial de estados CTT Express (STATUS_INCIDENTS_MANAGEMENTS.xlsx, hoja STATUS)
const CTT_STATUS_LABELS: Record<string, string> = {
  '0': 'Manifestado o grabado',
  '10': 'Recepción provisional',
  '20': 'Pendiente de depositar en punto CTT',
  '30': 'Depositado en punto pendiente de recoger',
  '300': 'Recogida asignada',
  '400': 'Recogida anulada',
  '500': 'Envío recogido',
  '600': 'Recogida fallida',
  '700': 'Delegación de origen',
  '900': 'En tránsito',
  '1000': 'Delegación de tránsito',
  '1100': 'Mal transitado',
  '1200': 'Delegación destino',
  '1500': 'En reparto',
  '1600': 'Reparto fallido',
  '1700': 'Envío estacionado',
  '1800': 'Estacionado ubicado',
  '1900': 'Pendiente de extracción',
  '2100': 'Entregado',
  '2200': 'Entrega parcial',
  '2300': 'Depositado en punto CTT',
  '2310': 'Disponible en punto CTT para entrega',
  '2400': 'Nuevo reparto',
  '2500': 'Devolución',
  '2600': 'Reexpedición',
  '2700': 'Entregado almacén regulador',
  '2900': 'Recoger en delegación',
  '3000': 'Envío anulado',
  '3900': 'Tránsito internacional',
  '3901': 'Gestión aduanera',
  '3902': 'Despachado',
  '3903': 'Revisión aduanera',
  '3904': 'Inspección aduanera',
}

const CTT_STATUS_ENTREGADO = new Set(['2100', '2700'])

export async function getCTTTracking(shippingCode: string): Promise<CTTTrackingResult> {
  const { token, cfg } = await getCTTToken()
  const { apiBase } = getCTTUrls(cfg.sandbox)

  const url = `${apiBase}/integrations-info/trf/item-history-api/history/${encodeURIComponent(shippingCode)}?view=APITRACK&showItems=false`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`CTT tracking (${res.status}): ${await res.text()}`)

  const raw = await res.text()
  if (!raw) {
    return { estado: 'No encontrado en CTT', entregado: false, ultimoEvento: undefined, eventos: [] }
  }

  const json = JSON.parse(raw)
  const events: CTTTrackingEvent[] = json?.data?.shipping_history?.events ?? []
  const statusEvents = events.filter(e => e.type === 'STATUS')
  const ultimo = statusEvents[statusEvents.length - 1] ?? events[events.length - 1]
  // CTT devuelve el código con padding (p.ej. "0000", "0900"); se normaliza para el lookup
  const codigo = ultimo ? String(parseInt(ultimo.code, 10)) : undefined
  const estado = (codigo && CTT_STATUS_LABELS[codigo]) || ultimo?.description || 'Sin información'

  return {
    estado,
    entregado: Boolean(codigo && CTT_STATUS_ENTREGADO.has(codigo)),
    fechaEntrega: json?.data?.delivery_date,
    ultimoEvento: estado,
    eventos: events,
  }
}

export interface CTTTrackingByReferenceResult {
  shippingCode: string
  estado: string
  entregado: boolean
}

// Busca un envío por la referencia de cliente (p.ej. el pedido de Amazon) cuando no
// tenemos el número de envío guardado. Usa el endpoint "Shipments Tracking List by Dates",
// que solo permite filtrar por client_center_code + rango de fechas, así que se filtra
// el resultado en cliente por client_references.
export async function getCTTTrackingByReference(
  reference: string,
  desde: Date
): Promise<CTTTrackingByReferenceResult | null> {
  const { token, cfg } = await getCTTToken()
  const { apiBase } = getCTTUrls(cfg.sandbox)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const dateFrom = new Date(desde)
  dateFrom.setDate(dateFrom.getDate() - 1)
  const dateTo = new Date()

  const url = `${apiBase}/integrations/trf/web-tracking/v1.0/shippings?page_limit=100&page_offsets=1&mapping_table_code=APITRACK&order_by=-shipping_date&client_center_code=${encodeURIComponent(cfg.clientCenterCode)}&shipping_date=${fmt(dateFrom)}[range]${fmt(dateTo)}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`CTT tracking by dates (${res.status}): ${await res.text()}`)

  const json = await res.json()
  const shipments: Array<{ shipping_code: string; shipping_status_code: string; client_references?: string[] }> = json?.data ?? []
  const match = shipments.find(s => s.client_references?.includes(reference))
  if (!match) return null

  const codigo = String(parseInt(match.shipping_status_code, 10))
  const estado = CTT_STATUS_LABELS[codigo] ?? 'Sin información'

  return {
    shippingCode: match.shipping_code,
    estado,
    entregado: CTT_STATUS_ENTREGADO.has(codigo),
  }
}

export async function getCTTLabel(shippingCode: string): Promise<Uint8Array> {
  const { token, cfg } = await getCTTToken()
  const { apiBase } = getCTTUrls(cfg.sandbox)

  const url = `${apiBase}/integrations/trf/labelling/v1.0/shippings/${encodeURIComponent(shippingCode)}/shipping-labels?label_type_code=PDF&model_type_code=MULTI4&label_offset=1`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'user_name': cfg.username,
      'password': cfg.password,
    },
  })

  if (!res.ok) throw new Error(`CTT label (${res.status}): ${await res.text()}`)

  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
    return new Uint8Array(await res.arrayBuffer())
  }

  // CTT returns JSON: { "data": [{ "label": "<base64 PDF>" }] }
  const json = await res.json()
  const b64: string | undefined = json?.data?.[0]?.label

  if (!b64) {
    throw new Error(`CTT label: campo no encontrado. Respuesta: ${JSON.stringify(json).slice(0, 400)}`)
  }

  return new Uint8Array(Buffer.from(b64, 'base64'))
}
