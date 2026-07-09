import { prisma } from '@/lib/prisma'

export interface LineaCalculada {
  concepto: string
  cantidad: number
  precioUnitario: number
  importe: number
}

export interface FacturaCalculada {
  lineas: LineaCalculada[]
  subtotal: number
  ivaPct: number
  iva: number
  total: number
}

const round = (n: number) => Math.round(n * 100) / 100

/** Rango [desde, hasta) en UTC para un periodo 'YYYY-MM'. */
function periodoRango(periodo: string): { desde: Date; hasta: Date } {
  const [y, m] = periodo.split('-').map(Number)
  return {
    desde: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
    hasta: new Date(Date.UTC(y, m, 1, 0, 0, 0)),
  }
}

const TARIFAS_DEFECTO = { cuotaMensual: 0, tarifaPedido: 0, tarifaRecepcion: 0, tarifaUnidadAlmacen: 0, iva: 21 }

/**
 * Calcula (sin persistir) las líneas de la factura de un cliente para un mes:
 * cuota fija + pedidos enviados + recepciones + almacenaje estimado, más IVA.
 */
export async function calcularFactura(clienteId: number, periodo: string): Promise<FacturaCalculada> {
  const rc = await prisma.rateCard.findUnique({ where: { clienteId } })
  const t = rc ?? TARIFAS_DEFECTO
  const { desde, hasta } = periodoRango(periodo)

  const lineas: LineaCalculada[] = []

  if (t.cuotaMensual > 0) {
    lineas.push({ concepto: 'Cuota mensual de servicio', cantidad: 1, precioUnitario: t.cuotaMensual, importe: round(t.cuotaMensual) })
  }

  if (t.tarifaPedido > 0) {
    const pedidos = await prisma.pedido.count({ where: { clienteId, enviadoAt: { gte: desde, lt: hasta } } })
    if (pedidos > 0) lineas.push({ concepto: 'Preparación y envío de pedidos', cantidad: pedidos, precioUnitario: t.tarifaPedido, importe: round(pedidos * t.tarifaPedido) })
  }

  if (t.tarifaRecepcion > 0) {
    const recepciones = await prisma.envio.count({ where: { clienteId, createdAt: { gte: desde, lt: hasta } } })
    if (recepciones > 0) lineas.push({ concepto: 'Recepción de mercancía (envíos entrantes)', cantidad: recepciones, precioUnitario: t.tarifaRecepcion, importe: round(recepciones * t.tarifaRecepcion) })
  }

  if (t.tarifaUnidadAlmacen > 0) {
    const agg = await prisma.producto.aggregate({ where: { clienteId }, _sum: { stockActual: true } })
    const unidades = agg._sum.stockActual ?? 0
    if (unidades > 0) lineas.push({ concepto: 'Almacenaje (estimado sobre stock actual)', cantidad: unidades, precioUnitario: t.tarifaUnidadAlmacen, importe: round(unidades * t.tarifaUnidadAlmacen) })
  }

  const subtotal = round(lineas.reduce((a, l) => a + l.importe, 0))
  const ivaPct = t.iva
  const iva = round((subtotal * ivaPct) / 100)
  const total = round(subtotal + iva)

  return { lineas, subtotal, ivaPct, iva, total }
}

/**
 * Genera (persiste) la factura del periodo. Si ya existe en borrador, la regenera.
 * Devuelve { id, regenerada } o lanza si la factura existente ya está emitida/pagada.
 */
export async function generarFactura(clienteId: number, periodo: string): Promise<{ id: number; regenerada: boolean }> {
  const calc = await calcularFactura(clienteId, periodo)
  const existente = await prisma.factura.findUnique({ where: { clienteId_periodo: { clienteId, periodo } } })

  if (existente) {
    if (existente.estado !== 'borrador') {
      throw new Error(`La factura de ${periodo} ya está ${existente.estado}; no se puede regenerar.`)
    }
    await prisma.$transaction([
      prisma.facturaLinea.deleteMany({ where: { facturaId: existente.id } }),
      prisma.factura.update({
        where: { id: existente.id },
        data: {
          subtotal: calc.subtotal, iva: calc.iva, total: calc.total,
          lineas: { create: calc.lineas },
        },
      }),
    ])
    return { id: existente.id, regenerada: true }
  }

  const f = await prisma.factura.create({
    data: {
      clienteId, periodo,
      subtotal: calc.subtotal, iva: calc.iva, total: calc.total,
      lineas: { create: calc.lineas },
    },
  })
  return { id: f.id, regenerada: false }
}
