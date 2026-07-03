import crypto from 'crypto'

const AUTH_BASE = 'https://auth.tiktok-shops.com'
const API_BASE = 'https://open-api.tiktokglobalshop.com'

interface TikTokAppCredentials {
  appKey: string
  appSecret: string
}

export async function exchangeAuthCode(
  code: string,
  creds: TikTokAppCredentials
): Promise<{ accessToken: string; refreshToken: string; shopId: string; shopCipher: string; sellerName: string }> {
  const url = new URL(`${AUTH_BASE}/api/v2/token/get`)
  url.searchParams.set('app_key', creds.appKey)
  url.searchParams.set('app_secret', creds.appSecret)
  url.searchParams.set('auth_code', code)
  url.searchParams.set('grant_type', 'authorized_code')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TikTok token (${res.status}): ${await res.text()}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`TikTok token: ${data.message}`)

  return {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    shopId: data.data.open_id,
    shopCipher: data.data.seller_base_region ?? '',
    sellerName: data.data.seller_name ?? data.data.open_id,
  }
}

export async function getAccessToken(
  refreshToken: string,
  creds: TikTokAppCredentials
): Promise<string> {
  const url = new URL(`${AUTH_BASE}/api/v2/token/refresh`)
  url.searchParams.set('app_key', creds.appKey)
  url.searchParams.set('app_secret', creds.appSecret)
  url.searchParams.set('refresh_token', refreshToken)
  url.searchParams.set('grant_type', 'refresh_token')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TikTok refresh (${res.status}): ${await res.text()}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`TikTok refresh: ${data.message}`)
  return data.data.access_token
}

// Firma HMAC-SHA256 requerida por TikTok Shop en cada llamada a la API:
// sign = HMAC(app_secret, path + params_ordenados_concatenados + body)
function signRequest(
  path: string,
  params: Record<string, string>,
  body: string,
  appSecret: string
): string {
  const sortedKeys = Object.keys(params).sort()
  const paramString = sortedKeys.map(k => `${k}${params[k]}`).join('')
  const base = `${path}${paramString}${body}`
  return crypto.createHmac('sha256', appSecret).update(base).digest('hex')
}

async function tiktokCall(
  path: string,
  accessToken: string,
  shopCipher: string,
  creds: TikTokAppCredentials,
  body: Record<string, unknown> = {}
) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const params: Record<string, string> = {
    app_key: creds.appKey,
    timestamp,
    shop_cipher: shopCipher,
  }
  const bodyStr = JSON.stringify(body)
  const sign = signRequest(path, params, bodyStr, creds.appSecret)

  const url = new URL(`${API_BASE}${path}`)
  Object.entries({ ...params, sign }).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tts-access-token': accessToken,
    },
    body: bodyStr,
  })
  if (!res.ok) throw new Error(`TikTok ${path} (${res.status}): ${await res.text()}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`TikTok ${path}: ${data.message}`)
  return data.data
}

export interface TikTokOrder {
  id: string
  create_time: number
  status: string
  recipient_address?: {
    name?: string
    full_address?: string
    postal_code?: string
    district_info?: { address_level_name: string }[]
    region_code?: string
  }
  line_items: { sku_id: string; seller_sku?: string; product_name: string; quantity?: number }[]
}

// Pedidos pendientes de envío (UNPAID/AWAITING_SHIPMENT según la API de TikTok Shop)
export async function getUnshippedOrders(
  accessToken: string,
  shopCipher: string,
  creds: TikTokAppCredentials,
  since: Date
): Promise<TikTokOrder[]> {
  const data = await tiktokCall('/order/202309/orders/search', accessToken, shopCipher, creds, {
    page_size: 50,
    order_status: 'AWAITING_SHIPMENT',
    create_time_ge: Math.floor(since.getTime() / 1000),
  })
  return data.orders ?? []
}
