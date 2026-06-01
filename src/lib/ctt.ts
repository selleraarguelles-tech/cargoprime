import { prisma } from './prisma'

const CTT_SCOPE = 'urn:com:ctt-express:integration-clients:scopes:common/ALL'

function getCTTUrls(sandbox: boolean) {
  return {
    authUrl: sandbox
      ? 'https://es-ctt-uat-integration-clients-pool-ids.auth.eu-west-1.amazoncognito.com/oauth2/token'
      : 'https://es-ctt-integration-clients-pool-ids.auth.eu-west-1.amazoncognito.com/oauth2/token',
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
}

export async function createCTTShipment(pedido: PedidoForCTT): Promise<string> {
  const { token, cfg } = await getCTTToken()
  const { apiBase } = getCTTUrls(cfg.sandbox)

  const body = {
    client_center_code: cfg.clientCenterCode,
    shipping_type_code: 'C24',
    client_references: [pedido.amazonOrderId.slice(0, 50), ''],
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
    }],
  }

  const res = await fetch(`${apiBase}/integrations/manifest/v1.0/shippings`, {
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

export async function getCTTLabel(shippingCode: string): Promise<Uint8Array> {
  const { token, cfg } = await getCTTToken()
  const { apiBase } = getCTTUrls(cfg.sandbox)

  const url = `${apiBase}/integrations/trf/labelling/v1.0/shippings/${encodeURIComponent(shippingCode)}/shipping-labels?label_type_code=PDF&model_type_code=SINGLE&label_offset=1`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'user_name': cfg.username,
      'password': cfg.password,
    },
  })

  if (!res.ok) throw new Error(`CTT label (${res.status}): ${await res.text()}`)

  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('pdf') || ct.includes('octet-stream')) {
    return new Uint8Array(await res.arrayBuffer())
  }

  // Maybe base64 JSON
  const data = await res.json()
  const b64: string = data.label ?? data.file ?? data.content ?? data.data
  if (b64) return new Uint8Array(Buffer.from(b64, 'base64'))

  throw new Error('CTT no devolvió la etiqueta en formato esperado')
}
