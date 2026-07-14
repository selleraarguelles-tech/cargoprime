const API_VERSION = '2024-10'

export interface ShopifyAddress {
  name?: string
  address1?: string
  address2?: string
  zip?: string
  city?: string
  country_code?: string
}

export interface ShopifyLineItem {
  sku?: string
  title: string
  quantity: number
  // Precio unitario (string decimal, p. ej. "12.90")
  price?: string
}

export interface ShopifyOrder {
  id: number
  name: string
  created_at: string
  fulfillment_status: string | null
  financial_status: string
  currency?: string
  shipping_address?: ShopifyAddress
  line_items: ShopifyLineItem[]
}

function shopifyBase(shopDomain: string) {
  return `https://${shopDomain}/admin/api/${API_VERSION}`
}

async function shopifyCall(shopDomain: string, accessToken: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${shopifyBase(shopDomain)}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Shopify ${path} (${res.status}): ${err}`)
  }
  return res.json()
}

// Comprueba que el access token es válido y devuelve el nombre de la tienda
export async function verifyShopifyStore(shopDomain: string, accessToken: string): Promise<{ name: string }> {
  const data = await shopifyCall(shopDomain, accessToken, '/shop.json')
  return { name: data.shop?.name ?? shopDomain }
}

// Pedidos no cumplimentados (equivalente a "Unshipped" de Amazon)
export async function getUnfulfilledOrders(
  shopDomain: string,
  accessToken: string,
  since: Date
): Promise<ShopifyOrder[]> {
  const data = await shopifyCall(shopDomain, accessToken, '/orders.json', {
    status: 'open',
    fulfillment_status: 'unfulfilled',
    created_at_min: since.toISOString(),
    limit: '250',
  })
  return data.orders ?? []
}
