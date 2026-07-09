'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, X, TrendingUp, TrendingDown } from 'lucide-react'
import type { PnLResumen, PnLRow } from '@/lib/pnl'

interface ClienteOpt { id: number; nombre: string }
interface Props {
  clientes: ClienteOpt[]
  clienteActivo: number
  periodo: string
  resumen: PnLResumen
}

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
const pct = (n: number | null) => n === null ? '—' : `${n}%`

export default function RentabilidadClient({ clientes, clienteActivo, periodo, resumen }: Props) {
  const router = useRouter()
  const [editar, setEditar] = useState<PnLRow | null>(null)
  const [form, setForm] = useState({ precioVenta: 0, costeUnitario: 0, comisionAmazon: 15 })
  const [saving, setSaving] = useState(false)

  function abrir(r: PnLRow) {
    setEditar(r)
    setForm({ precioVenta: r.precioVenta, costeUnitario: r.costeUnitario, comisionAmazon: r.comisionPct })
  }

  async function guardar() {
    if (!editar) return
    setSaving(true)
    const res = await fetch(`/api/productos/${editar.productoId}/economia`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setEditar(null); router.refresh() }
    else { const d = await res.json().catch(() => ({})); alert(`Error: ${d.error ?? 'No se pudo'}`) }
  }

  function nav(next: { cliente?: number; periodo?: string }) {
    const c = next.cliente ?? clienteActivo
    const p = next.periodo ?? periodo
    router.push(`/rentabilidad?cliente=${c}&periodo=${p}`)
  }

  const t = resumen.totales
  const margenColor = (m: number | null) => m === null ? 'text-gray-400' : m >= 20 ? 'text-emerald-600' : m >= 0 ? 'text-amber-600' : 'text-red-600'

  return (
    <>
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={clienteActivo}
          onChange={e => nav({ cliente: Number(e.target.value) })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input
          type="month"
          defaultValue={periodo}
          onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) nav({ periodo: e.target.value }) }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <p className="text-xs text-gray-400">Fulfillment aplicado: {eur(resumen.tarifaPedido)}/pedido (tarifa del cliente).</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{eur(t.ingresos)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Costes totales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{eur(t.coste + t.comision + t.fulfillment)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Beneficio</p>
          <p className={`text-2xl font-bold mt-1 flex items-center gap-1 ${t.beneficio >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {t.beneficio >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {eur(t.beneficio)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Margen</p>
          <p className={`text-2xl font-bold mt-1 ${margenColor(t.margenPct)}`}>{pct(t.margenPct)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3 text-right">Uds.</th>
                <th className="px-3 py-3 text-right">P. venta</th>
                <th className="px-3 py-3 text-right">Coste</th>
                <th className="px-3 py-3 text-right">Ingresos</th>
                <th className="px-3 py-3 text-right">COGS</th>
                <th className="px-3 py-3 text-right">Comisión</th>
                <th className="px-3 py-3 text-right">Fulfillment</th>
                <th className="px-3 py-3 text-right">Beneficio</th>
                <th className="px-3 py-3 text-right">Margen</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resumen.filas.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">Sin ventas en el periodo seleccionado.</td></tr>
              ) : resumen.filas.map(r => (
                <tr key={r.productoId} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-xs text-gray-700">{r.sku}</p>
                    <p className="text-[11px] text-gray-400 max-w-[180px] truncate" title={r.nombre}>{r.nombre}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{r.unidades}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.precioVenta)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.costeUnitario)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-900 font-medium">{eur(r.ingresos)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.coste)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.comision)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{eur(r.fulfillment)}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${r.beneficio >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{eur(r.beneficio)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${margenColor(r.margenPct)}`}>{pct(r.margenPct)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => abrir(r)} className="text-gray-400 hover:text-orange-600" title="Editar economía">
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {resumen.filas.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td className="px-3 py-3 text-gray-900">Total</td>
                  <td className="px-3 py-3 text-right text-gray-700">{t.unidades}</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right text-gray-900">{eur(t.ingresos)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{eur(t.coste)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{eur(t.comision)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{eur(t.fulfillment)}</td>
                  <td className={`px-3 py-3 text-right ${t.beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{eur(t.beneficio)}</td>
                  <td className={`px-3 py-3 text-right ${margenColor(t.margenPct)}`}>{pct(t.margenPct)}</td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">v1: cada pedido cuenta como 1 unidad del producto (no se guarda cantidad por línea). Edita precio de venta, coste y comisión por SKU con el icono ⚙️.</p>

      {/* Modal editar economía */}
      {editar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">Economía · {editar.sku}</h2>
                <p className="text-xs text-gray-400 truncate">{editar.nombre}</p>
              </div>
              <button onClick={() => setEditar(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {([
                ['precioVenta', 'Precio de venta por unidad (€)'],
                ['costeUnitario', 'Coste del producto por unidad (€)'],
                ['comisionAmazon', 'Comisión de Amazon (%)'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditar(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={guardar} disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
