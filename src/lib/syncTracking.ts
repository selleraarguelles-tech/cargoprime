import { prisma } from './prisma'
import { getOrderPackages } from './spapi'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const PENDIENTES_LIMIT = 100

export async function syncTrackingForCuenta(
  accessToken: string,
  marketplaceId: string,
  clienteId: number,
  isSandbox: boolean
): Promise<{ actualizados: number }> {
  const pendientes = await prisma.pedido.findMany({
    where: { clienteId, estado: { in: ['sin_etiqueta', 'preparando'] } },
    take: PENDIENTES_LIMIT,
  })

  let actualizados = 0

  for (const pedido of pendientes) {
    await sleep(300) // Orders API: 0.5 req/s
    const packages = await getOrderPackages(accessToken, marketplaceId, pedido.amazonOrderId, isSandbox)
    const pkg = packages.find(p => p.trackingNumber)
    if (!pkg) continue

    // Amazon devuelve "CTTExpress"; se normaliza al nombre usado por la app
    const carrier = pkg.carrier && /ctt/i.test(pkg.carrier) ? 'CTT Express' : pkg.carrier

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        trackingNumber: pkg.trackingNumber,
        transportista: carrier ?? pedido.transportista,
        trackingEstado: pkg.packageStatus?.status ?? null,
        estado: 'enviado',
        enviadoAt: pkg.shipTime ? new Date(pkg.shipTime) : new Date(),
      },
    })
    actualizados++
  }

  return { actualizados }
}
