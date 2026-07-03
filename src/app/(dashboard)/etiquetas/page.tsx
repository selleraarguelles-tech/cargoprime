import { prisma } from '@/lib/prisma'
import SyncButton from './SyncButton'
import EtiquetasLoteClient from './EtiquetasLoteClient'

export const dynamic = 'force-dynamic'

export default async function EtiquetasPage() {
  const pedidos = await prisma.pedido.findMany({
    where: { estado: { in: ['sin_etiqueta', 'preparando'] } },
    // Agrupados por producto para facilitar el picking y el etiquetado por lotes
    orderBy: [{ productoId: 'asc' }, { createdAt: 'asc' }],
    include: { cliente: true, producto: true },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
          <p className="text-gray-500 text-sm mt-1">Pedidos pendientes de etiquetar o preparar · selecciona varios para generarlas en un solo PDF</p>
        </div>
        <SyncButton />
      </div>

      <EtiquetasLoteClient
        pedidos={pedidos.map(p => ({
          id: p.id,
          amazonOrderId: p.amazonOrderId,
          destinatarioNombre: p.destinatarioNombre,
          destinatarioCiudad: p.destinatarioCiudad,
          destinatarioCP: p.destinatarioCP,
          productoNombre: p.producto.nombre,
          estado: p.estado,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
