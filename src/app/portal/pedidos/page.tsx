import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, ESTADOS_TRACKING, CANALES, formatDate, EstadoPedido } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ estado?: string }>
}

const FILTROS: { key: string; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'sin_etiqueta', label: 'Sin enviar' },
  { key: 'preparando', label: 'Preparando' },
  { key: 'enviado', label: 'Enviados' },
]

export default async function PortalPedidos({ searchParams }: Props) {
  const clienteId = await getSellerClienteId()
  const { estado } = await searchParams

  const where = { clienteId, ...(estado ? { estado } : {}) }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { producto: { select: { nombre: true, sku: true } } },
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis pedidos</h1>
        <p className="text-gray-500 text-sm mt-1">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}{pedidos.length === 500 ? ' (mostrando los 500 más recientes)' : ''}</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {FILTROS.map(f => {
          const active = (estado ?? '') === f.key
          return (
            <Link
              key={f.key}
              href={f.key ? `/portal/pedidos?estado=${f.key}` : '/portal/pedidos'}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                <th className="px-4 py-2.5">Nº seguimiento</th>
                <th className="px-4 py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pedidos.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Sin pedidos en este filtro.
                </td></tr>
              ) : pedidos.map(p => {
                const canal = CANALES[p.canal]
                const est = ESTADOS_PEDIDO[p.estado as EstadoPedido]
                const trk = p.trackingEstado ? ESTADOS_TRACKING[p.trackingEstado] : null
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{p.amazonOrderId}</td>
                    <td className="px-4 py-2.5"><Badge variant={canal?.variant ?? 'default'}>{canal?.label ?? p.canal}</Badge></td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[240px] truncate" title={p.producto.nombre}>{p.producto.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.destinatarioCiudad} <span className="text-gray-400">({p.destinatarioCP})</span></td>
                    <td className="px-4 py-2.5">{est ? <Badge variant={est.variant}>{est.label}</Badge> : p.estado}</td>
                    <td className="px-4 py-2.5">{trk ? <Badge variant={trk.variant}>{trk.label}</Badge> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.trackingNumber ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(p.createdAt)}</td>
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
