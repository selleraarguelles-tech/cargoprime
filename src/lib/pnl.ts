import { prisma } from '@/lib/prisma'

export interface PnLRow {
  productoId: number
  sku: string
  nombre: string
  unidades: number
  precioVenta: number
  costeUnitario: number
  comisionPct: number
  ingresos: number
  coste: number       // COGS (coste de producto)
  comision: number    // comisión Amazon
  fulfillment: number // lo que cobra CargoPrime (tarifaPedido × unidades)
  beneficio: number
  margenPct: number | null
}

export interface PnLResumen {
  filas: PnLRow[]
  totales: {
    unidades: number
    ingresos: number
    coste: number
    comision: number
    fulfillment: number
    beneficio: number
    margenPct: number | null
  }
  tarifaPedido: number
}

const round = (n: number) => Math.round(n * 100) / 100

function periodoRango(periodo: string): { desde: Date; hasta: Date } {
  const [y, m] = periodo.split('-').map(Number)
  return {
    desde: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
    hasta: new Date(Date.UTC(y, m, 1, 0, 0, 0)),
  }
}

/**
 * P&L por SKU de un cliente en un periodo 'YYYY-MM'.
 * Ingresos: usa el importe REAL del pedido cuando el sync lo capturó; para pedidos
 * sin importe (antiguos o importados sin precio) aplica precioVenta × unidades.
 * Fulfillment = tarifaPedido del RateCard del cliente × nº de pedidos.
 */
export async function calcularPnL(clienteId: number, periodo: string): Promise<PnLResumen> {
  const { desde, hasta } = periodoRango(periodo)
  const wherePeriodo = { clienteId, createdAt: { gte: desde, lt: hasta } }

  const [grupos, sinImporte, rateCard] = await Promise.all([
    prisma.pedido.groupBy({
      by: ['productoId'],
      where: wherePeriodo,
      _count: { id: true },
      _sum: { cantidad: true, importe: true },
    }),
    // Unidades de pedidos SIN importe real → se estiman con precioVenta
    prisma.pedido.groupBy({
      by: ['productoId'],
      where: { ...wherePeriodo, importe: null },
      _sum: { cantidad: true },
    }),
    prisma.rateCard.findUnique({ where: { clienteId }, select: { tarifaPedido: true } }),
  ])

  const sinImporteById = new Map(sinImporte.map(g => [g.productoId, g._sum.cantidad ?? 0]))

  const tarifaPedido = rateCard?.tarifaPedido ?? 0

  const productos = grupos.length
    ? await prisma.producto.findMany({
        where: { id: { in: grupos.map(g => g.productoId) } },
        select: { id: true, sku: true, nombre: true, precioVenta: true, costeUnitario: true, comisionAmazon: true },
      })
    : []
  const byId = new Map(productos.map(p => [p.id, p]))

  const filas: PnLRow[] = grupos.map(g => {
    const p = byId.get(g.productoId)
    const pedidos = g._count.id
    const unidades = g._sum.cantidad ?? pedidos
    const precioVenta = p?.precioVenta ?? 0
    const costeUnitario = p?.costeUnitario ?? 0
    const comisionPct = p?.comisionAmazon ?? 0

    // Ingresos: importes reales capturados + estimación (precioVenta) para lo que no tiene importe
    const ingresosReales = g._sum.importe ?? 0
    const unidadesEstimadas = sinImporteById.get(g.productoId) ?? 0
    const ingresos = round(ingresosReales + unidadesEstimadas * precioVenta)
    const coste = round(unidades * costeUnitario)
    const comision = round((ingresos * comisionPct) / 100)
    // Se factura por pedido preparado, no por unidad
    const fulfillment = round(pedidos * tarifaPedido)
    const beneficio = round(ingresos - coste - comision - fulfillment)
    const margenPct = ingresos > 0 ? round((beneficio / ingresos) * 100) : null

    return {
      productoId: g.productoId,
      sku: p?.sku ?? '—',
      nombre: p?.nombre ?? '(producto eliminado)',
      unidades, precioVenta, costeUnitario, comisionPct,
      ingresos, coste, comision, fulfillment, beneficio, margenPct,
    }
  }).sort((a, b) => b.beneficio - a.beneficio)

  const totales = filas.reduce(
    (acc, f) => ({
      unidades: acc.unidades + f.unidades,
      ingresos: round(acc.ingresos + f.ingresos),
      coste: round(acc.coste + f.coste),
      comision: round(acc.comision + f.comision),
      fulfillment: round(acc.fulfillment + f.fulfillment),
      beneficio: round(acc.beneficio + f.beneficio),
      margenPct: null as number | null,
    }),
    { unidades: 0, ingresos: 0, coste: 0, comision: 0, fulfillment: 0, beneficio: 0, margenPct: null as number | null }
  )
  totales.margenPct = totales.ingresos > 0 ? round((totales.beneficio / totales.ingresos) * 100) : null

  return { filas, totales, tarifaPedido }
}
