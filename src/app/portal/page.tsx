import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, ESTADOS_TRACKING, CANALES, formatDate, EstadoPedido } from '@/lib/utils'
import { Package, Truck, CheckCircle2, AlertTriangle, PackageX, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ENTREGADO = ['Entregado', 'Entregado almacén regulador', 'DELIVERED']

export default async function PortalInicio() {
  const clienteId = await getSellerClienteId()

  const [cliente, total, pendientes, enviados, entregados, productos, ultimos] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { nombre: true } }),
    prisma.pedido.count({ where: { clienteId } }),
    prisma.pedido.count({ where: { clienteId, estado: { in: ['sin_etiqueta', 'preparando'] } } }),
    prisma.pedido.count({ where: { clienteId, estado: 'enviado' } }),
    prisma.pedido.count({ where: { clienteId, trackingEstado: { in: ENTREGADO } } }),
    prisma.producto.findMany({ where: { clienteId }, select: { stockActual: true, stockMinimo: true } }),
    prisma.pedido.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { producto: { select: { nombre: true } } },
    }),
  ])

  const stockBajo = productos.filter(p => p.stockActual <= p.stockMinimo).length

  const kpis = [
    { label: 'Pedidos totales', value: total, icon: Package, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Pendientes de enviar', value: pendientes, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Enviados', value: enviados, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Entregados', value: entregados, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'SKUs con stock bajo', value: stockBajo, icon: PackageX, color: stockBajo > 0 ? 'text-red-600' : 'text-slate-400', bg: stockBajo > 0 ? 'bg-red-50' : 'bg-slate-100' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hola, {cliente?.nombre}</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de tu operativa en CargoPrime.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className={`inline-flex ${k.bg} rounded-lg p-2 mb-3`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Últimos pedidos</h2>
          <Link href="/portal/pedidos" className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">Pedido</th>
                <th className="px-4 py-2.5">Canal</th>
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5">Destino</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Seguimiento</th>
                <th className="px-4 py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ultimos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Aún no tienes pedidos.</td></tr>
              ) : ultimos.map(p => {
                const canal = CANALES[p.canal]
                const est = ESTADOS_PEDIDO[p.estado as EstadoPedido]
                const trk = p.trackingEstado ? ESTADOS_TRACKING[p.trackingEstado] : null
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{p.amazonOrderId}</td>
                    <td className="px-4 py-2.5"><Badge variant={canal?.variant ?? 'default'}>{canal?.label ?? p.canal}</Badge></td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[220px] truncate">{p.producto.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.destinatarioCiudad}</td>
                    <td className="px-4 py-2.5">{est ? <Badge variant={est.variant}>{est.label}</Badge> : p.estado}</td>
                    <td className="px-4 py-2.5">{trk ? <Badge variant={trk.variant}>{trk.label}</Badge> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDate(p.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
