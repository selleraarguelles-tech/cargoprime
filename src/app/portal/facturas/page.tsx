import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import { Receipt, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

function periodoLabel(periodo: string) {
  const [y, m] = periodo.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const ESTADO_BADGE: Record<string, string> = {
  emitida: 'bg-blue-100 text-blue-700',
  pagada: 'bg-emerald-100 text-emerald-700',
}

export default async function PortalFacturas() {
  const clienteId = await getSellerClienteId()

  // El seller solo ve facturas emitidas o pagadas (los borradores son internos).
  const facturas = await prisma.factura.findMany({
    where: { clienteId, estado: { in: ['emitida', 'pagada'] } },
    orderBy: { periodo: 'desc' },
    select: { id: true, periodo: true, estado: true, total: true, createdAt: true },
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Facturas</h1>
        <p className="text-gray-500 text-sm mt-1">{facturas.length} factura{facturas.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Nº</th>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Emitida</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {facturas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aún no tienes facturas.
                </td></tr>
              ) : facturas.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">#{String(f.id).padStart(4, '0')}</td>
                  <td className="px-4 py-3 text-gray-700">{periodoLabel(f.periodo)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(f.createdAt).toLocaleDateString('es-ES')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{eur(f.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[f.estado] ?? 'bg-slate-100 text-slate-600'}`}>{f.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/portal/facturas/${f.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <FileText className="w-3.5 h-3.5" /> Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
