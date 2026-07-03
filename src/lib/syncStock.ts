import { prisma } from './prisma'
import { getListingStock } from './spapi'
import { sendLowStockEmail, emailConfigurado } from './mail'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function syncStockForCuenta(
  accessToken: string,
  sellerId: string,
  marketplaceId: string,
  clienteId: number,
  isSandbox: boolean
): Promise<{ updated: number; errors: number; avisos: number }> {
  const [productos, cliente] = await Promise.all([
    prisma.producto.findMany({
      where: { clienteId, NOT: { sku: { startsWith: 'ASIN-' } } },
      select: { id: true, sku: true, nombre: true, stockMinimo: true, notificadoStockBajo: true },
    }),
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { nombre: true, email: true } }),
  ])

  const puedeAvisar = emailConfigurado() && !!cliente?.email
  let updated = 0
  let errors = 0
  let avisos = 0

  for (const producto of productos) {
    await sleep(200) // Listings API: 5 req/s
    const qty = await getListingStock(accessToken, sellerId, marketplaceId, producto.sku, isSandbox)
    if (qty < 0) { errors++; continue }

    const bajoMinimo = qty <= producto.stockMinimo
    const data: { stockActual: number; notificadoStockBajo?: boolean } = { stockActual: qty }

    if (bajoMinimo && !producto.notificadoStockBajo) {
      data.notificadoStockBajo = true
      if (puedeAvisar) {
        try {
          await sendLowStockEmail(cliente!.email, cliente!.nombre, producto.nombre, producto.sku, qty, producto.stockMinimo)
          avisos++
        } catch (e) {
          console.error('[syncStock] fallo email stock bajo:', e instanceof Error ? e.message : e)
        }
      }
    } else if (!bajoMinimo && producto.notificadoStockBajo) {
      data.notificadoStockBajo = false
    }

    await prisma.producto.update({ where: { id: producto.id }, data })
    updated++
  }

  return { updated, errors, avisos }
}
