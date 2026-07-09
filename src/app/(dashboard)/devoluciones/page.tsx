import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DevolucionesClient from './DevolucionesClient'

export const dynamic = 'force-dynamic'

export default async function DevolucionesPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  const devoluciones = await prisma.devolucion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: {
      cliente: { select: { nombre: true } },
      pedido: { select: { amazonOrderId: true, producto: { select: { nombre: true, sku: true } } } },
    },
  })

  const filas = devoluciones.map(d => ({
    id: d.id,
    amazonOrderId: d.pedido.amazonOrderId,
    producto: d.pedido.producto.nombre,
    sku: d.pedido.producto.sku,
    cliente: d.cliente.nombre,
    motivo: d.motivo,
    estado: d.estado,
    reingresado: d.reingresado,
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Devoluciones</h1>
        <p className="text-gray-500 text-sm mt-1">Gestión de devoluciones de clientes y reingreso a stock.</p>
      </div>
      <DevolucionesClient filas={filas} />
    </div>
  )
}
