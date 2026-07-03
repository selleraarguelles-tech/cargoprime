'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search } from 'lucide-react'

interface Props {
  pedidoId: number
  tieneTracking: boolean
}

export default function TrackingRefresh({ pedidoId, tieneTracking }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function actualizar() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/pedidos/${pedidoId}/ctt-tracking`)
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      setError(data.error ?? 'Error al consultar CTT')
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={actualizar}
        disabled={loading}
        title={tieneTracking ? 'Consultar estado actual en CTT' : 'Buscar este pedido en CTT por referencia'}
        className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
      >
        {tieneTracking ? (
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        ) : (
          <Search className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
        )}
      </button>
      {error && <span className="text-xs text-gray-400">{error}</span>}
    </span>
  )
}
