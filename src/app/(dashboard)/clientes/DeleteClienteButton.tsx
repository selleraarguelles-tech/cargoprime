'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props { clienteId: number; clienteNombre: string }

export default function DeleteClienteButton({ clienteId, clienteNombre }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/clientes/${clienteId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const err = await res.json()
      alert(err.error ?? 'Error al eliminar cliente')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-60"
        >
          {loading ? '...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors"
      title={`Eliminar ${clienteNombre}`}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
