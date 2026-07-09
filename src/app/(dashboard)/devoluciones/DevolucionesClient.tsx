'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Badge from '@/components/Badge'
import { Plus, X, PackageCheck, RotateCcw, Check, Ban, Trash2, Undo2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Fila {
  id: number
  amazonOrderId: string
  producto: string
  sku: string
  cliente: string
  motivo: string | null
  estado: string
  reingresado: boolean
  createdAt: string
}

const ESTADO: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' }> = {
  solicitada: { label: 'Solicitada', variant: 'warning' },
  recibida: { label: 'Recibida', variant: 'info' },
  reembolsada: { label: 'Reembolsada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
}

export default function DevolucionesClient({ filas }: { filas: Fila[] }) {
  const router = useRouter()
  const [crear, setCrear] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  async function handleCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/devoluciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) { setCrear(false); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Error') }
  }

  async function cambiar(id: number, estado: string, reingresar = false) {
    setBusy(id)
    const res = await fetch(`/api/devoluciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, reingresar }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); alert(`Error: ${d.error ?? 'No se pudo'}`) }
  }

  async function borrar(id: number) {
    if (!confirm('¿Borrar esta devolución?')) return
    setBusy(id)
    const res = await fetch(`/api/devoluciones/${id}`, { method: 'DELETE' })
    setBusy(null)
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); alert(`Error: ${d.error ?? 'No se pudo'}`) }
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => { setCrear(true); setError('') }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva devolución
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Sin devoluciones registradas.
                </td></tr>
              ) : filas.map(f => {
                const est = ESTADO[f.estado] ?? ESTADO.solicitada
                return (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{f.amazonOrderId}</td>
                    <td className="px-4 py-3 text-gray-700">{f.cliente}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={f.producto}>
                      <span className="font-mono text-xs text-gray-400">{f.sku}</span> · {f.producto}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate" title={f.motivo ?? ''}>{f.motivo ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={est.variant}>{est.label}</Badge></td>
                    <td className="px-4 py-3">{f.reingresado ? <span className="text-xs text-emerald-600 flex items-center gap-1"><Undo2 className="w-3 h-3" />Reingresado</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(f.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {f.estado === 'solicitada' && (
                          <>
                            <button disabled={busy === f.id} onClick={() => cambiar(f.id, 'recibida', true)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-emerald-700 hover:bg-emerald-50 disabled:opacity-50" title="Marcar recibida y reingresar 1 unidad al stock">
                              <PackageCheck className="w-3.5 h-3.5" /> Recibir + stock
                            </button>
                            <button disabled={busy === f.id} onClick={() => cambiar(f.id, 'recibida', false)} className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50" title="Marcar recibida sin tocar stock">
                              Recibir
                            </button>
                            <button disabled={busy === f.id} onClick={() => cambiar(f.id, 'rechazada')} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50" title="Rechazar">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {f.estado === 'recibida' && (
                          <button disabled={busy === f.id} onClick={() => cambiar(f.id, 'reembolsada')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-emerald-700 hover:bg-emerald-50 disabled:opacity-50" title="Marcar reembolsada">
                            <Check className="w-3.5 h-3.5" /> Reembolsar
                          </button>
                        )}
                        {!f.reingresado && (
                          <button disabled={busy === f.id} onClick={() => borrar(f.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50" title="Borrar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {crear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Nueva devolución</h2>
              <button onClick={() => setCrear(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nº de pedido *</label>
                <input name="amazonOrderId" required placeholder="402-XXXXXXX-XXXXXXX" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <p className="text-xs text-gray-400 mt-1">Se vincula al pedido y cliente automáticamente.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input name="motivo" placeholder="Producto defectuoso, no lo quiere…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCrear(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                  {saving ? 'Creando...' : 'Crear devolución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
