import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, ESTADOS_TRACKING, CANALES, formatDate } from '@/lib/utils'
import { Plus, Search, Tag } from 'lucide-react'
import PedidosFilters from './PedidosFilters'
import EstadoSelector from './EstadoSelector'
import TrackingRefresh from './TrackingRefresh'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ estado?: string; cliente?: string; buscar?: string; desde?: string; hasta?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

  const params = await searchParams
  const { estado, cliente, buscar, desde, hasta } = params

  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: 'asc' } })

  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado
  if (cliente) where.clienteId = parseInt(cliente)
  if (buscar) {
    where.OR = [
      { amazonOrderId: { contains: buscar } },
      { destinatarioNombre: { contains: buscar } },
      { destinatarioCiudad: { contains: buscar } },
    ]
  }
  if (desde || hasta) {
    const createdAt: Record<string, Date> = {}
    if (desde) createdAt.gte = new Date(`${desde}T00:00:00`)
    if (hasta) createdAt.lte = new Date(`${hasta}T23:59:59.999`)
    where.createdAt = createdAt
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { cliente: true, producto: true },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} encontrado{pedidos.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Link href="/pedidos/nuevo" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo pedido
          </Link>
        )}
      </div>

      <PedidosFilters clientes={clientes} estadoActivo={estado} clienteActivo={cliente} buscarActivo={buscar} desdeActivo={desde} hastaActivo={hasta} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nº Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seguimiento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado envío</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Etiqueta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No se encontraron pedidos con los filtros aplicados
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => {
                  const estadoInfo = ESTADOS_PEDIDO[pedido.estado as keyof typeof ESTADOS_PEDIDO]
                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{pedido.amazonOrderId}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const canalInfo = CANALES[pedido.canal]
                          return <Badge variant={canalInfo?.variant ?? 'default'}>{canalInfo?.label ?? pedido.canal}</Badge>
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{pedido.cliente.nombre}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{pedido.destinatarioNombre}</p>
                        <p className="text-xs text-gray-500">{pedido.destinatarioCiudad} {pedido.destinatarioCP}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{pedido.producto.nombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(pedido.createdAt)}</td>
                      <td className="px-4 py-3">
                        <EstadoSelector pedidoId={pedido.id} estadoActual={pedido.estado} isAdmin={isAdmin} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {pedido.trackingNumber ? (
                          <>
                            <p className="font-mono text-gray-900">{pedido.trackingNumber}</p>
                            {pedido.transportista && <p className="text-gray-400">{pedido.transportista}</p>}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {pedido.trackingEstado ? (
                            (() => {
                              const trackingInfo = ESTADOS_TRACKING[pedido.trackingEstado]
                              return <Badge variant={trackingInfo?.variant ?? 'default'}>{trackingInfo?.label ?? pedido.trackingEstado}</Badge>
                            })()
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                          {(!pedido.transportista || pedido.transportista === 'CTT Express') && (
                            <TrackingRefresh pedidoId={pedido.id} tieneTracking={!!pedido.trackingNumber} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/etiquetas/${pedido.id}`} className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium">
                          <Tag className="w-3.5 h-3.5" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
