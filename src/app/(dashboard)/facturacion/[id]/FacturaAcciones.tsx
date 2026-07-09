'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Send, CheckCircle2, Trash2 } from 'lucide-react'

export default function FacturaAcciones({ id, estado }: { id: number; estado: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function cambiarEstado(nuevo: string) {
    setLoading(true)
    const res = await fetch(`/api/facturacion/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevo }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); alert(`Error: ${d.error ?? 'No se pudo'}`) }
  }

  async function borrar() {
    if (!confirm('¿Borrar esta factura en borrador?')) return
    setLoading(true)
    const res = await fetch(`/api/facturacion/${id}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) router.push('/facturacion')
    else { const d = await res.json().catch(() => ({})); alert(`Error: ${d.error ?? 'No se pudo'}`) }
  }

  const btn = 'inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50'

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => window.print()} className={`${btn} text-gray-700 border border-gray-200 hover:bg-gray-50`}>
        <Printer className="w-4 h-4" /> Imprimir
      </button>
      {estado === 'borrador' && (
        <>
          <button onClick={borrar} disabled={loading} className={`${btn} text-red-600 border border-red-200 hover:bg-red-50`}>
            <Trash2 className="w-4 h-4" /> Borrar
          </button>
          <button onClick={() => cambiarEstado('emitida')} disabled={loading} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
            <Send className="w-4 h-4" /> Marcar emitida
          </button>
        </>
      )}
      {estado === 'emitida' && (
        <button onClick={() => cambiarEstado('pagada')} disabled={loading} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
          <CheckCircle2 className="w-4 h-4" /> Marcar pagada
        </button>
      )}
    </div>
  )
}
