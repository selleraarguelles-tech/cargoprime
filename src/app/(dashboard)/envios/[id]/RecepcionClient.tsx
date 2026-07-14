'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, PackageCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ProductoOpt { id: number; sku: string; nombre: string }
interface Linea { id: number; sku: string; nombre: string; esperada: number; recibida: number | null }

interface Props {
  envioId: number
  recibido: boolean
  recibidoAt: string | null
  productos: ProductoOpt[]
  lineas: Linea[]
}

export default function RecepcionClient({ envioId, recibido, recibidoAt, productos, lineas }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [recibidas, setRecibidas] = useState<Record<number, string>>(
    Object.fromEntries(lineas.map(l => [l.id, String(l.esperada)]))
  )

  async function agregarLinea(e: React.FormEvent) {
    e.preventDefault()
    if (!productoId || !cantidad) return
    setBusy(true); setError('')
    const res = await fetch(`/api/envios/${envioId}/lineas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productoId, cantidadEsperada: cantidad }),
    })
    setBusy(false)
    if (res.ok) { setProductoId(''); setCantidad(''); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Error al añadir') }
  }

  async function quitarLinea(lineaId: number) {
    setBusy(true); setError('')
    const res = await fetch(`/api/envios/${envioId}/lineas?lineaId=${lineaId}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Error al quitar') }
  }

  async function recibirTodo() {
    if (!confirm('¿Confirmar la recepción? Las unidades recibidas entrarán al stock.')) return
    setBusy(true); setError('')
    const res = await fetch(`/api/envios/${envioId}/recibir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineas: lineas.map(l => ({ lineaId: l.id, cantidadRecibida: parseInt(recibidas[l.id] || '0') })),
      }),
    })
    setBusy(false)
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      alert(d.discrepancias > 0
        ? `Recepción registrada con ${d.discrepancias} discrepancia${d.discrepancias !== 1 ? 's' : ''}. Stock actualizado.`
        : 'Recepción registrada sin discrepancias. Stock actualizado.')
      router.refresh()
    } else {
      setError(d.error ?? 'Error al recibir')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Líneas del envío ({lineas.length})</h2>
        {recibido && (
          <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Recibido{recibidoAt ? ` el ${new Date(recibidoAt).toLocaleDateString('es-ES')}` : ''}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-2.5">SKU</th>
              <th className="px-4 py-2.5">Producto</th>
              <th className="px-4 py-2.5 text-right">Esperado</th>
              <th className="px-4 py-2.5 text-right">Recibido</th>
              <th className="px-4 py-2.5">Discrepancia</th>
              {!recibido && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lineas.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                Añade abajo los SKUs que se esperan en este envío.
              </td></tr>
            ) : lineas.map(l => {
              const rec = recibido ? l.recibida : parseInt(recibidas[l.id] || '0')
              const dif = (rec ?? 0) - l.esperada
              return (
                <tr key={l.id} className={dif !== 0 && (recibido || recibidas[l.id] !== '') ? 'bg-amber-50/40' : ''}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{l.sku}</td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-[240px] truncate" title={l.nombre}>{l.nombre}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{l.esperada}</td>
                  <td className="px-4 py-2.5 text-right">
                    {recibido ? (
                      <span className="font-semibold text-gray-900">{l.recibida ?? '—'}</span>
                    ) : (
                      <input
                        type="number" min={0}
                        value={recibidas[l.id] ?? ''}
                        onChange={e => setRecibidas(r => ({ ...r, [l.id]: e.target.value }))}
                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {dif === 0 ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                    ) : (
                      <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {dif > 0 ? `+${dif}` : dif}
                      </span>
                    )}
                  </td>
                  {!recibido && (
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => quitarLinea(l.id)} disabled={busy} className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-40" title="Quitar línea">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!recibido && (
        <div className="px-6 py-4 border-t border-gray-100 space-y-4">
          {/* Añadir línea */}
          <form onSubmit={agregarLinea} className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Producto esperado</label>
              <select value={productoId} onChange={e => setProductoId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="">Selecciona producto…</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Uds. esperadas</label>
              <input type="number" min={1} value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <button type="submit" disabled={busy || !productoId || !cantidad} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg disabled:opacity-50">
              <Plus className="w-4 h-4" /> Añadir línea
            </button>
          </form>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* Confirmar recepción */}
          {lineas.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <p className="text-xs text-gray-400">Ajusta las unidades realmente recibidas y confirma: entrarán al stock con su movimiento trazado.</p>
              <button onClick={recibirTodo} disabled={busy} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                <PackageCheck className="w-4 h-4" />
                {busy ? 'Registrando...' : 'Confirmar recepción'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
