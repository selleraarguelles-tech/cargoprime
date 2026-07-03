import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import NuevoPedidoForm from './NuevoPedidoForm'

export const dynamic = 'force-dynamic'

export default async function NuevoPedidoPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/pedidos')

  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: 'asc' },
    include: { productos: true },
  })

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nuevo pedido</h1>
        <p className="text-gray-500 text-sm mt-1">Registra un nuevo pedido de Amazon FBM</p>
      </div>
      <NuevoPedidoForm clientes={clientes} />
    </div>
  )
}
