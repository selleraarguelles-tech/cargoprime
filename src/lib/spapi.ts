const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'

const SP_API_ENDPOINTS: Record<string, string> = {
  'A1RKKUPIHCS9HS': 'https://sellingpartnerapi-eu.amazon.com', // Spain
  'A13V1IB3VIYZZH': 'https://sellingpartnerapi-eu.amazon.com', // France
  'A1PA6795UKMFR9': 'https://sellingpartnerapi-eu.amazon.com', // Germany
  'APJ6JRA9NG5V4':  'https://sellingpartnerapi-eu.amazon.com', // Italy
  'A1F83G8C2ARO7P': 'https://sellingpartnerapi-eu.amazon.com', // UK
  'ATVPDKIKX0DER':  'https://sellingpartnerapi-na.amazon.com', // US
  'A2EUQ1WTGCTBG2': 'https://sellingpartnerapi-na.amazon.com', // Canada
  'A1VC38T7YXB528': 'https://sellingpartnerapi-fe.amazon.com', // Japan
}

const SP_API_SANDBOX_ENDPOINTS: Record<string, string> = {
  'A1RKKUPIHCS9HS': 'https://sandbox.sellingpartnerapi-eu.amazon.com',
  'A13V1IB3VIYZZH': 'https://sandbox.sellingpartnerapi-eu.amazon.com',
  'A1PA6795UKMFR9': 'https://sandbox.sellingpartnerapi-eu.amazon.com',
  'APJ6JRA9NG5V4':  'https://sandbox.sellingpartnerapi-eu.amazon.com',
  'A1F83G8C2ARO7P': 'https://sandbox.sellingpartnerapi-eu.amazon.com',
  'ATVPDKIKX0DER':  'https://sandbox.sellingpartnerapi-na.amazon.com',
  'A2EUQ1WTGCTBG2': 'https://sandbox.sellingpartnerapi-na.amazon.com',
  'A1VC38T7YXB528': 'https://sandbox.sellingpartnerapi-fe.amazon.com',
}

export const MARKETPLACES: Record<string, { nombre: string; id: string }> = {
  'España':         { nombre: 'Amazon.es (España)',      id: 'A1RKKUPIHCS9HS' },
  'Francia':        { nombre: 'Amazon.fr (Francia)',     id: 'A13V1IB3VIYZZH' },
  'Alemania':       { nombre: 'Amazon.de (Alemania)',    id: 'A1PA6795UKMFR9' },
  'Italia':         { nombre: 'Amazon.it (Italia)',      id: 'APJ6JRA9NG5V4'  },
  'Reino Unido':    { nombre: 'Amazon.co.uk (UK)',       id: 'A1F83G8C2ARO7P' },
  'Estados Unidos': { nombre: 'Amazon.com (US)',         id: 'ATVPDKIKX0DER'  },
  'Canadá':         { nombre: 'Amazon.ca (Canadá)',      id: 'A2EUQ1WTGCTBG2' },
  'Japón':          { nombre: 'Amazon.co.jp (Japón)',    id: 'A1VC38T7YXB528' },
}

function getSpApiBase(marketplaceId: string, sandbox = false): string {
  if (sandbox) return SP_API_SANDBOX_ENDPOINTS[marketplaceId] ?? 'https://sandbox.sellingpartnerapi-eu.amazon.com'
  return SP_API_ENDPOINTS[marketplaceId] ?? 'https://sellingpartnerapi-eu.amazon.com'
}

interface LwaCredentials {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export async function exchangeAuthCode(
  code: string,
  creds: LwaCredentials
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error intercambiando código de autorización (${res.status}): ${err}`)
  }
  const data = await res.json()
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}

export async function getAccessToken(
  refreshToken: string,
  creds: Pick<LwaCredentials, 'clientId' | 'clientSecret'>
): Promise<string> {
  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error renovando token de Amazon (${res.status}): ${err}`)
  }
  const data = await res.json()
  return data.access_token as string
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function spCall(
  accessToken: string,
  marketplaceId: string,
  path: string,
  params?: Record<string, string>,
  sandbox = false
) {
  const base = getSpApiBase(marketplaceId, sandbox)
  const url = new URL(`${base}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { 'x-amz-access-token': accessToken, 'Content-Type': 'application/json' },
    })
    if (res.status === 429) {
      // Respect Retry-After header or use exponential backoff (2s, 4s, 8s)
      const retryAfter = res.headers.get('Retry-After')
      const wait = retryAfter ? parseFloat(retryAfter) * 1000 : 2000 * Math.pow(2, attempt)
      await sleep(wait)
      continue
    }
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`SP-API ${path} (${res.status}): ${err}`)
    }
    return res.json()
  }
  throw new Error(`SP-API ${path}: quota excedida tras varios reintentos`)
}

export interface AmazonOrder {
  AmazonOrderId: string
  PurchaseDate: string
  OrderStatus: string
  FulfillmentChannel: string
  ShippingAddress?: {
    Name: string
    AddressLine1?: string
    AddressLine2?: string
    PostalCode?: string
    City?: string
    CountryCode?: string
  }
}

export interface AmazonOrderItem {
  ASIN: string
  SellerSKU?: string
  OrderItemId: string
  Title: string
  QuantityOrdered: number
}

async function fetchOrdersFrom(
  accessToken: string,
  marketplaceId: string,
  since: Date,
  statuses: string,
  sandbox: boolean
): Promise<AmazonOrder[]> {
  const all: AmazonOrder[] = []
  let nextToken: string | undefined

  do {
    const params: Record<string, string> = nextToken
      ? { NextToken: nextToken }
      : sandbox
        ? { MarketplaceIds: marketplaceId }
        : {
            MarketplaceIds: marketplaceId,
            FulfillmentChannels: 'MFN',
            OrderStatuses: statuses,
            MaxResultsPerPage: '50',
            CreatedAfter: since.toISOString(),
          }
    const data = await spCall(accessToken, marketplaceId, '/orders/v0/orders', params, sandbox)
    all.push(...(data.payload?.Orders ?? []))
    nextToken = data.payload?.NextToken
  } while (nextToken)

  return all
}

export async function getOrders(
  accessToken: string,
  marketplaceId: string,
  daysSince = 30,
  sandbox = false
): Promise<AmazonOrder[]> {
  const since = new Date()
  since.setDate(since.getDate() - daysSince)
  return fetchOrdersFrom(accessToken, marketplaceId, since, 'Unshipped,PartiallyShipped,Shipped', sandbox)
}

export async function getRecentUnshippedOrders(
  accessToken: string,
  marketplaceId: string,
  since: Date,
  sandbox = false
): Promise<AmazonOrder[]> {
  return fetchOrdersFrom(accessToken, marketplaceId, since, 'Unshipped,PartiallyShipped', sandbox)
}

export async function getOrderItems(
  accessToken: string,
  marketplaceId: string,
  orderId: string,
  sandbox = false
): Promise<AmazonOrderItem[]> {
  const data = await spCall(accessToken, marketplaceId, `/orders/v0/orders/${orderId}/orderItems`, undefined, sandbox)
  return data.payload?.OrderItems ?? []
}

export async function getOrderAddress(
  accessToken: string,
  marketplaceId: string,
  orderId: string,
  sandbox = false
): Promise<AmazonOrder['ShippingAddress'] | null> {
  try {
    const data = await spCall(accessToken, marketplaceId, `/orders/v0/orders/${orderId}/address`, undefined, sandbox)
    return data.payload?.ShippingAddress ?? null
  } catch {
    return null
  }
}

export async function getMFNLabel(
  accessToken: string,
  marketplaceId: string,
  shipmentId: string,
  sandbox = false
): Promise<{ format: string; data: string } | null> {
  try {
    const data = await spCall(accessToken, marketplaceId, `/mfn/v0/shipments/${shipmentId}/label`, undefined, sandbox)
    return data.payload ?? null
  } catch {
    return null
  }
}
