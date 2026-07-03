import { prisma } from '@/lib/prisma'
import { ShoppingCart, AlertTriangle, Package, Users, Clock, TrendingUp, Truck, CheckCircle2, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, CANALES, formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const TRACKING_ENTREGADO = new Set(['Entregado', 'Entregado almacén regulador', 'DELIVERED'])
const TRACKING_INCIDENCIA = new Set([
  'Reparto fallido', 'Recogida fallida', 'Recogida anulada', 'Envío anulado', 'Devolución',
  'Mal transitado', 'UNDELIVERABLE', 'RETURNING', 'RETURNED',
])

function claveDia(d: Date) {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(d)
}

async function getMetrics() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const hace7 = new Date(today); hace7.setDate(hace7.getDate() - 7)
  const hace30 = new Date(today); hace30.setDate(hace30.getDate() - 29)

  const [pedidosHoy, sinEtiqueta, enviados7d, clientesActivos, ultimosPedidos, productosLista, pedidos30d, conTracking] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.pedido.count({ where: { estado: 'sin_etiqueta' } }),
    prisma.pedido.count({ where: { estado: 'enviado', createdAt: { gte: hace7 } } }),
    prisma.cliente.count(),
    prisma.pedido.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { cliente: true, producto: true },
    }),
    prisma.producto.findMany({ include: { cliente: true }, orderBy: { stockActual: 'asc' } }),
    prisma.pedido.findMany({
      where: { createdAt: { gte: hace30 } },
      select: { createdAt: true, canal: true },
    }),
    prisma.pedido.findMany({
      where: { trackingEstado: { not: null } },
      select: { trackingEstado: true },
    }),
  ])

  const productosStockBajo = productosLista.filter(p => p.stockActual <= p.stockMinimo)

  // Pedidos por día (últimos 14 días)
  const dias: { clave: string; label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    dias.push({
      clave: claveDia(d),
      label: new Intl.DateTimeFormat('es-ES', { day: 'numeric', timeZone: 'Europe/Madrid' }).format(d),
      count: 0,
    })
  }
  const porDia = new Map(dias.map(d => [d.clave, d]))
  for (const p of pedidos30d) {
    const entry = porDia.get(claveDia(p.createdAt))
    if (entry) entry.count++
  }

  // Pedidos por canal (30 días)
  const porCanal = new Map<string, number>()
  for (const p of pedidos30d) porCanal.set(p.canal, (porCanal.get(p.canal) ?? 0) + 1)

  // Estado de los envíos con tracking
  let entregados = 0, incidencias = 0, enCurso = 0
  for (const p of conTracking) {
    const e = p.trackingEstado!
    if (TRACKING_ENTREGADO.has(e)) entregados++
    else if (TRACKING_INCIDENCIA.has(e)) incidencias++
    else enCurso++
  }

  return {
    pedidosHoy, sinEtiqueta, enviados7d, clientesActivos, ultimosPedidos,
    stockBajo: productosStockBajo.length,
    productosStockBajo: productosStockBajo.slice(0, 5),
    dias,
    porCanal: [...porCanal.entries()].sort((a, b) => b[1] - a[1]),
    total30d: pedidos30d.length,
    tracking: { entregados, incidencias, enCurso, total: conTracking.length },
  }
}

export default async function DashboardPage() {
  const m = await getMetrics()
  const maxDia = Math.max(1, ...m.dias.map(d => d.count))

  const metrics = [
    { label: 'Pedidos hoy', value: m.pedidosHoy, icon: ShoppingCart, color: 'bg-blue-500', href: '/pedidos' },
    { label: 'Sin etiqueta', value: m.sinEtiqueta, icon: Clock, color: m.sinEtiqueta > 0 ? 'bg-red-500' : 'bg-green-500', href: '/pedidos?estado=sin_etiqueta', alert: m.sinEtiqueta > 0 },
    { label: 'Enviados (7 días)', value: m.enviados7d, icon: Truck, color: 'bg-teal-500', href: '/pedidos?estado=enviado' },
    { label: 'Incidencias de envío', value: m.tracking.incidencias, icon: AlertTriangle, color: m.tracking.incidencias > 0 ? 'bg-red-500' : 'bg-green-500', href: '/pedidos', alert: m.tracking.incidencias > 0 },
    { label: 'Stock bajo mínimos', value: m.stockBajo, icon: Package, color: m.stockBajo > 0 ? 'bg-orange-500' : 'bg-green-500', href: '/inventario', alert: m.stockBajo > 0 },
    { label: 'Clientes activos', value: m.clientesActivos, icon: Users, color: 'bg-purple-500', href: '/clientes' },
  ]

  const canalColor: Record<string, string> = { amazon: 'bg-orange-400', tiktok: 'bg-gray-800', shopify: 'bg-green-500' }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de operaciones del almacén</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map(({ label, value, icon: Icon, color, href, alert }) => (
          <Link key={label} href={href}>
            <div className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 hover:shadow-md transition-shadow h-full ${alert ? 'border-red-200' : 'border-[#e4e8f0]'}`}>
              <div className={`${color} rounded-lg p-2.5 shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 truncate">{label}</p>
              </div>
              {alert && (
                <span className="ml-auto flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos por día */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#e4e8f0] p-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Pedidos por día
          </h2>
          <p className="text-xs text-gray-400 mb-4">Últimos 14 días</p>
          <div className="flex items-end gap-1.5 h-36">
            {m.dias.map(d => (
              <div key={d.clave} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.clave}: ${d.count} pedidos`}>
                <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                <div
                  className={`w-full rounded-t transition-colors ${d.count > 0 ? 'bg-orange-400 group-hover:bg-orange-500' : 'bg-gray-100'}`}
                  style={{ height: `${Math.max(4, (d.count / maxDia) * 100)}%` }}
                />
                <span className="text-[10px] text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por canal + estado de envíos */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Pedidos por canal <span className="text-xs font-normal text-gray-400">(30 días)</span></h2>
            {m.total30d === 0 ? (
              <p className="text-sm text-gray-400">Sin pedidos en el período</p>
            ) : (
              <div className="space-y-2.5">
                {m.porCanal.map(([canal, count]) => (
                  <div key={canal}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{CANALES[canal]?.label ?? canal}</span>
                      <span className="text-gray-500">{count} · {Math.round((count / m.total30d) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${canalColor[canal] ?? 'bg-gray-400'}`} style={{ width: `${(count / m.total30d) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Estado de los envíos</h2>
            {m.tracking.total === 0 ? (
              <p className="text-sm text-gray-400">Aún sin datos de seguimiento</p>
            ) : (
              <>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-3">
                  {m.tracking.entregados > 0 && <div className="bg-green-500" style={{ width: `${(m.tracking.entregados / m.tracking.total) * 100}%` }} />}
                  {m.tracking.enCurso > 0 && <div className="bg-amber-400" style={{ width: `${(m.tracking.enCurso / m.tracking.total) * 100}%` }} />}
                  {m.tracking.incidencias > 0 && <div className="bg-red-500" style={{ width: `${(m.tracking.incidencias / m.tracking.total) * 100}%` }} />}
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-2 text-gray-600"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Entregados <span className="ml-auto font-semibold text-gray-900">{m.tracking.entregados}</span></p>
                  <p className="flex items-center gap-2 text-gray-600"><Truck className="w-3.5 h-3.5 text-amber-500" /> En curso <span className="ml-auto font-semibold text-gray-900">{m.tracking.enCurso}</span></p>
                  <p className="flex items-center gap-2 text-gray-600"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Incidencias <span className="ml-auto font-semibold text-gray-900">{m.tracking.incidencias}</span></p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimos pedidos */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#e4e8f0]">
          <div className="px-6 py-4 border-b border-[#e4e8f0] flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Últimos pedidos
            </h2>
            <Link href="/pedidos" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {m.ultimosPedidos.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No hay pedidos todavía</p>
            ) : (
              m.ultimosPedidos.map((pedido) => {
                const estado = ESTADOS_PEDIDO[pedido.estado as keyof typeof ESTADOS_PEDIDO]
                const canal = CANALES[pedido.canal]
                return (
                  <div key={pedido.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{pedido.amazonOrderId}</p>
                      <p className="text-xs text-gray-500">{pedido.cliente.nombre} · {pedido.destinatarioCiudad}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <Badge variant={canal?.variant ?? 'default'}>{canal?.label ?? pedido.canal}</Badge>
                      <Badge variant={estado?.variant ?? 'default'}>{estado?.label ?? pedido.estado}</Badge>
                      <span className="text-xs text-gray-400 hidden sm:block">{formatDateTime(pedido.createdAt)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Alertas de stock */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0]">
          <div className="px-6 py-4 border-b border-[#e4e8f0] flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              Stock bajo mínimos
            </h2>
            <Link href="/inventario" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Ver todo →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {m.productosStockBajo.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">Todo el stock en niveles correctos ✓</p>
            ) : (
              m.productosStockBajo.map((producto) => (
                <div key={producto.id} className="px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{producto.nombre}</p>
                      <p className="text-xs text-gray-500">{producto.sku} · {producto.cliente.nombre}</p>
                    </div>
                    <div className="shrink-0 ml-2 text-right">
                      <span className={`text-lg font-bold ${producto.stockActual === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                        {producto.stockActual}
                      </span>
                      <p className="text-xs text-gray-400">mín. {producto.stockMinimo}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
