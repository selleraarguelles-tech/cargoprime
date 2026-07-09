import Link from 'next/link'
import { getSellerClienteId } from '@/lib/sellerAuth'
import { calcularPnL } from '@/lib/pnl'
import { TrendingUp, TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ periodo?: string }> }

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
const pct = (n: number | null) => n === null ? '—' : `${n}%`

function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const margenColor = (m: number | null) => m === null ? 'text-gray-400' : m >= 20 ? 'text-emerald-600' : m >= 0 ? 'text-amber-600' : 'text-red-600'

export default async function PortalRentabilidad({ searchParams }: Props) {
  const clienteId = await getSellerClienteId()
  const params = await searchParams
  const periodo = /^\d{4}-\d{2}$/.test(params.periodo ?? '') ? params.periodo! : periodoActual()

  const { filas, totales, tarifaPedido } = await calcularPnL(clienteId, periodo)

  // Meses recientes para el selector (últimos 6)
  const meses: string[] = []
  const base = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Rentabilidad</h1>
          <p className="text-gray-500 text-sm mt-1">Beneficio por producto: ventas menos coste, comisión de Amazon y fulfillment.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {meses.map(m => {
            const activo = m === periodo
            const label = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
            return (
              <Link key={m} href={`/portal/rentabilidad?periodo=${m}`} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activo ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{eur(totales.ingresos)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Costes totales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{eur(totales.coste + totales.comision + totales.fulfillment)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Beneficio</p>
          <p className={`text-2xl font-bold mt-1 flex items-center gap-1 ${totales.beneficio >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totales.beneficio >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {eur(totales.beneficio)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Margen</p>
          <p className={`text-2xl font-bold mt-1 ${margenColor(totales.margenPct)}`}>{pct(totales.margenPct)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3 text-right">Uds.</th>
                <th className="px-3 py-3 text-right">Ingresos</th>
                <th className="px-3 py-3 text-right">COGS</th>
                <th className="px-3 py-3 text-right">Comisión</th>
                <th className="px-3 py-3 text-right">Fulfillment</th>
                <th className="px-3 py-3 text-right">Beneficio</th>
                <th className="px-3 py-3 text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Sin ventas en el periodo seleccionado.</td></tr>
              ) : filas.map(r => (
                <tr key={r.productoId} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-xs text-gray-700">{r.sku}</p>
                    <p className="text-[11px] text-gray-400 max-w-[200px] truncate" title={r.nombre}>{r.nombre}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{r.unidades}</td>
                  <td className="px-3 py-2.5 text-right text-gray-900 font-medium">{eur(r.ingresos)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.coste)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.comision)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.fulfillment)}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${r.beneficio >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{eur(r.beneficio)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${margenColor(r.margenPct)}`}>{pct(r.margenPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Fulfillment aplicado: {eur(tarifaPedido)}/pedido. Si algún dato de coste o precio no es correcto, contáctanos y lo ajustamos.
      </p>
    </div>
  )
}
