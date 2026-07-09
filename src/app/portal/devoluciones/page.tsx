import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import Badge from '@/components/Badge'
import { formatDate } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ESTADO: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' }> = {
  solicitada: { label: 'Solicitada', variant: 'warning' },
  recibida: { label: 'Recibida', variant: 'info' },
  reembolsada: { label: 'Reembolsada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
}

export default async function PortalDevoluciones() {
  const clienteId = await getSellerClienteId()

  const devoluciones = await prisma.devolucion.findMany({
    where: { clienteId },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { pedido: { select: { amazonOrderId: true, producto: { select: { nombre: true, sku: true } } } } },
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Devoluciones</h1>
        <p className="text-gray-500 text-sm mt-1">{devoluciones.length} devolución{devoluciones.length !== 1 ? 'es' : ''}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {devoluciones.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No tienes devoluciones.
                </td></tr>
              ) : devoluciones.map(d => {
                const est = ESTADO[d.estado] ?? ESTADO.solicitada
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.pedido.amazonOrderId}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[240px] truncate" title={d.pedido.producto.nombre}>
                      <span className="font-mono text-xs text-gray-400">{d.pedido.producto.sku}</span> · {d.pedido.producto.nombre}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate" title={d.motivo ?? ''}>{d.motivo ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={est.variant}>{est.label}</Badge></td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(d.createdAt)}</td>
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
