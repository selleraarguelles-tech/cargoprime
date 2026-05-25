import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Link from 'next/link'
import { Plus, Users, Package, ShoppingCart } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import DeleteClienteButton from './DeleteClienteButton'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { productos: true, pedidos: true } } },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Link href="/clientes/nuevo" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo cliente
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes.length === 0 ? (
          <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No hay clientes todavía</p>
            {isAdmin && (
              <Link href="/clientes/nuevo" className="mt-3 inline-block text-sm text-orange-600 hover:text-orange-700 font-medium">
                Añadir el primer cliente →
              </Link>
            )}
          </div>
        ) : (
          clientes.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-orange-100 rounded-lg p-2.5">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Link href={`/clientes/${cliente.id}`} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">
                      Editar
                    </Link>
                    <DeleteClienteButton clienteId={cliente.id} clienteNombre={cliente.nombre} />
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-gray-900">{cliente.nombre}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{cliente.email}</p>
              {cliente.telefono && <p className="text-sm text-gray-400 mt-0.5">{cliente.telefono}</p>}

              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Package className="w-3.5 h-3.5" />
                  {cliente._count.productos} producto{cliente._count.productos !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {cliente._count.pedidos} pedido{cliente._count.pedidos !== 1 ? 's' : ''}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Desde {formatDate(cliente.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
