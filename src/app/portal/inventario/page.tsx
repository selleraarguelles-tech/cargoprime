import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import Badge from '@/components/Badge'
import { Package, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PortalInventario() {
  const clienteId = await getSellerClienteId()

  const productos = await prisma.producto.findMany({
    where: { clienteId },
    orderBy: { nombre: 'asc' },
    select: { id: true, sku: true, nombre: true, stockActual: true, stockMinimo: true },
  })

  const bajos = productos.filter(p => p.stockActual <= p.stockMinimo).length

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
        <p className="text-gray-500 text-sm mt-1">{productos.length} referencia{productos.length !== 1 ? 's' : ''} en almacén</p>
      </div>

      {bajos > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Tienes <strong>{bajos}</strong> referencia{bajos !== 1 ? 's' : ''} en o por debajo del stock mínimo. Conviene reponer.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5 text-right">Stock actual</th>
                <th className="px-4 py-2.5 text-right">Stock mínimo</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aún no hay productos registrados.
                </td></tr>
              ) : productos.map(p => {
                const bajo = p.stockActual <= p.stockMinimo
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${bajo ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{p.sku}</td>
                    <td className="px-4 py-2.5 text-gray-700 max-w-[320px] truncate" title={p.nombre}>{p.nombre}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${bajo ? 'text-red-600' : 'text-gray-900'}`}>{p.stockActual}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{p.stockMinimo}</td>
                    <td className="px-4 py-2.5">
                      {bajo ? <Badge variant="danger">Stock bajo</Badge> : <Badge variant="success">OK</Badge>}
                    </td>
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
