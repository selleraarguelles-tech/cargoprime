import { prisma } from './prisma'
import { getListingStock } from './spapi'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function syncStockForCuenta(
  accessToken: string,
  sellerId: string,
  marketplaceId: string,
  clienteId: number,
  isSandbox: boolean
): Promise<{ updated: number; errors: number }> {
  const productos = await prisma.producto.findMany({
    where: { clienteId, NOT: { sku: { startsWith: 'ASIN-' } } },
    select: { id: true, sku: true },
  })

  let updated = 0
  let errors = 0

  for (const producto of productos) {
    await sleep(200) // Listings API: 5 req/s
    const qty = await getListingStock(accessToken, sellerId, marketplaceId, producto.sku, isSandbox)
    if (qty >= 0) {
      await prisma.producto.update({ where: { id: producto.id }, data: { stockActual: qty } })
      updated++
    } else {
      errors++
    }
  }

  return { updated, errors }
}
