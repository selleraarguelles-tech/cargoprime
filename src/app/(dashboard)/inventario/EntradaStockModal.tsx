'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Producto { id: number; nombre: string; sku: string; clienteNombre: string }
interface Props { productos: Producto[] }

export default function EntradaStockModal({ productos }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))

    const res = await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, tipo: 'entrada' }),
    })

    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const err = await res.json()
      setError(err.error ?? 'Error al registrar entrada')
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Entrada de stock
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Registrar entrada de stock</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
                <select name="productoId" required className={inputClass}>
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — {p.sku} ({p.clienteNombre})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                <input name="cantidad" type="number" min="1" required placeholder="Unidades recibidas" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <input name="nota" placeholder="Albarán, referencia, etc." className={inputClass} />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60 transition-colors">
                  {loading ? 'Guardando...' : 'Registrar entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
