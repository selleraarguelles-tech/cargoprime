import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Badge from '@/components/Badge'
import { AlertTriangle, Package, TrendingUp, ArrowDownCircle } from 'lucide-react'
import EntradaStockModal from './EntradaStockModal'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

  const productos = await prisma.producto.findMany({
    include: { cliente: true },
    orderBy: [{ cliente: { nombre: 'asc' } }, { nombre: 'asc' }],
  })

  const movimientos = await prisma.movimientoStock.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { producto: { include: { cliente: true } } },
  })

  const bajosMinimo = productos.filter(p => p.stockActual <= p.stockMinimo)
  const sinStock = productos.filter(p => p.stockActual === 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 text-sm mt-1">{productos.length} productos · {bajosMinimo.length} bajo mínimos</p>
        </div>
        {isAdmin && <EntradaStockModal productos={productos.map(p => ({ id: p.id, nombre: p.nombre, sku: p.sku, clienteNombre: p.cliente.nombre }))} />}
      </div>

      {bajosMinimo.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <p className="text-sm font-semibold text-orange-800">
              {bajosMinimo.length} producto{bajosMinimo.length !== 1 ? 's' : ''} bajo mínimos
              {sinStock.length > 0 && ` (${sinStock.length} sin stock)`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {bajosMinimo.map(p => (
              <span key={p.id} className={`text-xs px-2 py-1 rounded-full font-medium ${p.stockActual === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                {p.nombre}: {p.stockActual} ud.
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla productos */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Stock por producto</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mínimo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productos.map((producto) => {
                  const bajo = producto.stockActual <= producto.stockMinimo
                  const sinStock = producto.stockActual === 0
                  return (
                    <tr key={producto.id} className={`hover:bg-gray-50 transition-colors ${bajo ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{producto.sku}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{producto.nombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{producto.cliente.nombre}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-base ${sinStock ? 'text-red-600' : bajo ? 'text-orange-500' : 'text-gray-900'}`}>
                          {producto.stockActual}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{producto.stockMinimo}</td>
                      <td className="px-4 py-3">
                        {sinStock ? (
                          <Badge variant="danger">Sin stock</Badge>
                        ) : bajo ? (
                          <Badge variant="warning">Bajo mínimo</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial movimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Últimos movimientos</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {movimientos.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">Sin movimientos registrados</p>
            ) : (
              movimientos.map((mov) => (
                <div key={mov.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{mov.producto.nombre}</p>
                      <p className="text-xs text-gray-400">{mov.nota ?? mov.tipo}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <ArrowDownCircle className={`w-3.5 h-3.5 ${mov.tipo === 'entrada' ? 'text-green-500 rotate-180' : 'text-red-400'}`} />
                      <span className={`text-sm font-bold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
