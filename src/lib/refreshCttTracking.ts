import { prisma } from './prisma'
import { getCTTTracking } from './ctt'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Estados finales: no tiene sentido volver a consultarlos
const FINALES = ['Entregado', 'Entregado almacén regulador', 'Devolución', 'Reexpedición', 'Envío anulado']

/**
 * Refresca el estado CTT de los envíos aún no finalizados (entregado/devuelto/anulado).
 * Pensado para ejecutarse en el cron: recorre los pedidos recientes con tracking de
 * CTT Express y actualiza trackingEstado con el último evento real.
 */
export async function refreshCttTrackingPendientes(limit = 100): Promise<{ revisados: number; actualizados: number; errores: number }> {
  const hace60dias = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const pedidos = await prisma.pedido.findMany({
    where: {
      // Amazon devuelve el carrier como "CTTExpress" (sin espacio); la app usa "CTT Express"
      transportista: { in: ['CTT Express', 'CTTExpress'] },
      trackingNumber: { not: null },
      createdAt: { gte: hace60dias },
      OR: [{ trackingEstado: null }, { trackingEstado: { notIn: FINALES } }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, trackingNumber: true, trackingEstado: true, transportista: true },
  })

  let actualizados = 0
  let errores = 0

  for (const pedido of pedidos) {
    await sleep(150) // margen holgado frente al límite de CTT (~30 req/s)
    try {
      const t = await getCTTTracking(pedido.trackingNumber!)
      const data: { trackingEstado?: string; transportista?: string; entregadoAt?: Date; enviadoAt?: Date } = {}
      if (t.estado && t.estado !== pedido.trackingEstado) data.trackingEstado = t.estado
      if (pedido.transportista === 'CTTExpress') data.transportista = 'CTT Express' // normalizar
      if (t.entregadoEn) data.entregadoAt = new Date(t.entregadoEn) // fecha real de entrega (métrica de plazo)
      if (t.expedidoEn) data.enviadoAt = new Date(t.expedidoEn) // fecha real de expedición según CTT
      if (Object.keys(data).length > 0) {
        await prisma.pedido.update({ where: { id: pedido.id }, data })
        if (data.trackingEstado) actualizados++
      }
    } catch (e) {
      errores++
      console.error('[refreshCttTracking]', pedido.id, e instanceof Error ? e.message : e)
    }
  }

  return { revisados: pedidos.length, actualizados, errores }
}
