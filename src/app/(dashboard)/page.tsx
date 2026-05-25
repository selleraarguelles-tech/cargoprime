import { prisma } from '@/lib/prisma'
import { ShoppingCart, AlertTriangle, Package, Users, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getMetrics() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [pedidosHoy, sinEtiqueta, clientesActivos, ultimosPedidos, productosStockBajoLista] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.pedido.count({ where: { estado: 'sin_etiqueta' } }),
    prisma.cliente.count(),
    prisma.pedido.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { cliente: true, producto: true },
    }),
    prisma.producto.findMany({
      include: { cliente: true },
      orderBy: { stockActual: 'asc' },
    }),
  ])

  const productosStockBajo = productosStockBajoLista.filter(p => p.stockActual <= p.stockMinimo)
  const stockBajo = productosStockBajo.length

  return { pedidosHoy, sinEtiqueta, stockBajo, clientesActivos, ultimosPedidos, productosStockBajo: productosStockBajo.slice(0, 5) }
}

export default async function DashboardPage() {
  const { pedidosHoy, sinEtiqueta, stockBajo, clientesActivos, ultimosPedidos, productosStockBajo } =
    await getMetrics()

  const metrics = [
    { label: 'Pedidos hoy', value: pedidosHoy, icon: ShoppingCart, color: 'bg-blue-500', href: '/pedidos' },
    { label: 'Sin etiqueta', value: sinEtiqueta, icon: Clock, color: sinEtiqueta > 0 ? 'bg-red-500' : 'bg-green-500', href: '/pedidos?estado=sin_etiqueta', alert: sinEtiqueta > 0 },
    { label: 'Stock bajo mínimos', value: stockBajo, icon: AlertTriangle, color: stockBajo > 0 ? 'bg-orange-500' : 'bg-green-500', href: '/inventario', alert: stockBajo > 0 },
    { label: 'Clientes activos', value: clientesActivos, icon: Users, color: 'bg-purple-500', href: '/clientes' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de operaciones del almacén</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color, href, alert }) => (
          <Link key={label} href={href}>
            <div className={`bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4 hover:shadow-md transition-shadow ${alert ? 'border-red-200' : 'border-gray-100'}`}>
              <div className={`${color} rounded-lg p-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
              {alert && (
                <div className="ml-auto">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimos pedidos */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Últimos pedidos
            </h2>
            <Link href="/pedidos" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {ultimosPedidos.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No hay pedidos todavía</p>
            ) : (
              ultimosPedidos.map((pedido) => {
                const estado = ESTADOS_PEDIDO[pedido.estado as keyof typeof ESTADOS_PEDIDO]
                return (
                  <div key={pedido.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{pedido.amazonOrderId}</p>
                      <p className="text-xs text-gray-500">{pedido.cliente.nombre} · {pedido.destinatarioCiudad}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              Stock bajo mínimos
            </h2>
            <Link href="/inventario" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Ver todo →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {productosStockBajo.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">Todo el stock en niveles correctos ✓</p>
            ) : (
              productosStockBajo.map((producto) => (
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
