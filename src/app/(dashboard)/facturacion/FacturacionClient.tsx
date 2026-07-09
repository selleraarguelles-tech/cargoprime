'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings2, FileText, FilePlus2, X, ExternalLink, Loader2 } from 'lucide-react'

interface Tarifas {
  cuotaMensual: number
  tarifaPedido: number
  tarifaRecepcion: number
  tarifaUnidadAlmacen: number
  iva: number
  configurada: boolean
}
interface Factura { id: number; total: number; estado: string }
interface Fila { id: number; nombre: string; tarifas: Tarifas; factura: Factura | null }

interface Props { periodo: string; filas: Fila[] }

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'bg-slate-100 text-slate-600',
  emitida: 'bg-blue-100 text-blue-700',
  pagada: 'bg-emerald-100 text-emerald-700',
}

export default function FacturacionClient({ periodo, filas }: Props) {
  const router = useRouter()
  const [editar, setEditar] = useState<Fila | null>(null)
  const [form, setForm] = useState<Tarifas | null>(null)
  const [saving, setSaving] = useState(false)
  const [genId, setGenId] = useState<number | null>(null)
  const [error, setError] = useState('')

  function abrirEditar(f: Fila) {
    setEditar(f)
    setForm({ ...f.tarifas })
    setError('')
  }

  async function guardarTarifas() {
    if (!editar || !form) return
    setSaving(true); setError('')
    const res = await fetch('/api/facturacion/tarifas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId: editar.id, ...form }),
    })
    setSaving(false)
    if (res.ok) { setEditar(null); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Error al guardar') }
  }

  async function generar(f: Fila) {
    setGenId(f.id); setError('')
    const res = await fetch('/api/facturacion/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId: f.id, periodo }),
    })
    const d = await res.json().catch(() => ({}))
    setGenId(null)
    if (res.ok) router.push(`/facturacion/${d.id}`)
    else alert(`Error: ${d.error ?? 'No se pudo generar'}`)
  }

  function cambiarPeriodo(v: string) {
    if (/^\d{4}-\d{2}$/.test(v)) router.push(`/facturacion?periodo=${v}`)
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Periodo:</label>
        <input
          type="month"
          defaultValue={periodo}
          onChange={e => cambiarPeriodo(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <p className="text-xs text-gray-400">Los pedidos se facturan por su fecha de envío dentro del periodo.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">€/pedido</th>
                <th className="px-4 py-3 text-right">€/recepción</th>
                <th className="px-4 py-3 text-right">Cuota</th>
                <th className="px-4 py-3 text-center">Tarifas</th>
                <th className="px-4 py-3">Factura del periodo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.nombre}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{eur(f.tarifas.tarifaPedido)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{eur(f.tarifas.tarifaRecepcion)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{eur(f.tarifas.cuotaMensual)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => abrirEditar(f)} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600" title="Editar tarifas">
                      <Settings2 className="w-3.5 h-3.5" /> {f.tarifas.configurada ? 'Editar' : 'Configurar'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {f.factura ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{eur(f.factura.total)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[f.factura.estado] ?? ESTADO_BADGE.borrador}`}>{f.factura.estado}</span>
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {f.factura ? (
                        <Link href={`/facturacion/${f.factura.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                          <FileText className="w-3.5 h-3.5" /> Ver
                        </Link>
                      ) : null}
                      <button
                        onClick={() => generar(f)}
                        disabled={genId === f.id}
                        className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {genId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}
                        {f.factura ? 'Regenerar' : 'Generar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar tarifas */}
      {editar && form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Tarifas · {editar.nombre}</h2>
              <button onClick={() => setEditar(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {([
                ['tarifaPedido', 'Precio por pedido enviado (€)'],
                ['tarifaRecepcion', 'Precio por recepción / envío entrante (€)'],
                ['tarifaUnidadAlmacen', 'Almacenaje por unidad/mes (€)'],
                ['cuotaMensual', 'Cuota mensual fija (€)'],
                ['iva', 'IVA (%)'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              ))}
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditar(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button onClick={guardarTarifas} disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar tarifas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <ExternalLink className="w-3 h-3" /> Al generar se crea la factura en borrador; ábrela para revisarla, marcarla como emitida/pagada o imprimirla.
      </p>
    </>
  )
}
