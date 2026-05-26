import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, formatDate } from '@/lib/utils'
import { Tag, Printer } from 'lucide-react'
import SyncButton from './SyncButton'

export const dynamic = 'force-dynamic'

export default async function EtiquetasPage() {
  const pedidos = await prisma.pedido.findMany({
    where: { estado: { in: ['sin_etiqueta', 'preparando'] } },
    orderBy: [{ estado: 'asc' }, { createdAt: 'asc' }],
    include: { cliente: true, producto: true },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
          <p className="text-gray-500 text-sm mt-1">Pedidos pendientes de etiquetar o preparar</p>
        </div>
        <SyncButton />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido Amazon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No hay pedidos pendientes de etiquetar
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => {
                  const estadoInfo = ESTADOS_PEDIDO[pedido.estado as keyof typeof ESTADOS_PEDIDO]
                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{pedido.amazonOrderId}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{pedido.destinatarioNombre}</p>
                        <p className="text-xs text-gray-500">{pedido.destinatarioCiudad} {pedido.destinatarioCP}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{pedido.producto.nombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(pedido.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={estadoInfo?.variant ?? 'default'}>{estadoInfo?.label ?? pedido.estado}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/etiquetas/${pedido.id}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir
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
