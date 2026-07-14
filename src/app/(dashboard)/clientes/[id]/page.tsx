import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ClienteForm from '../ClienteForm'
import CopiarEnlaceButton from './CopiarEnlaceButton'
import TransportistasCliente from './TransportistasCliente'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params
  const cliente = await prisma.cliente.findUnique({
    where: { id: parseInt(id) },
    include: {
      productos: { orderBy: { nombre: 'asc' } },
      pedidos: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { producto: true },
      },
      transportistas: true,
    },
  })

  if (!cliente) notFound()

  const prefDe = (canal: string) =>
    cliente.transportistas.find(t => t.canal === canal)?.transportista ?? 'ctt'

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/clientes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{cliente.nombre}</h1>
          <p className="text-gray-500 text-sm mt-1">Cliente desde {formatDate(cliente.createdAt)}</p>
        </div>
        <CopiarEnlaceButton clienteId={cliente.id} />
      </div>

      <ClienteForm cliente={cliente} />

      <TransportistasCliente
        clienteId={cliente.id}
        inicial={{ amazon: prefDe('amazon'), tiktok: prefDe('tiktok'), shopify: prefDe('shopify') }}
      />

      {/* Productos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Productos ({cliente.productos.length})</h2>
        </div>
        {cliente.productos.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">No hay productos para este cliente</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mínimo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cliente.productos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-900">{p.nombre}</td>
                  <td className="px-4 py-3 text-right font-bold">{p.stockActual}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{p.stockMinimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Últimos pedidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Últimos pedidos</h2>
          <Link href={`/pedidos?cliente=${cliente.id}`} className="text-sm text-orange-600 hover:text-orange-700">
            Ver todos →
          </Link>
        </div>
        {cliente.pedidos.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">No hay pedidos para este cliente</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {cliente.pedidos.map(p => {
              const estado = ESTADOS_PEDIDO[p.estado as keyof typeof ESTADOS_PEDIDO]
              return (
                <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 font-mono">{p.amazonOrderId}</p>
                    <p className="text-xs text-gray-500">{p.producto.nombre} · {formatDate(p.createdAt)}</p>
                  </div>
                  <Badge variant={estado?.variant ?? 'default'}>{estado?.label ?? p.estado}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
