'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface Props {
  pedidoId: number
}

export default function TrackingRefresh({ pedidoId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function actualizar() {
    setLoading(true)
    const res = await fetch(`/api/pedidos/${pedidoId}/ctt-tracking`)
    setLoading(false)
    if (res.ok) router.refresh()
  }

  return (
    <button
      onClick={actualizar}
      disabled={loading}
      title="Consultar estado actual en CTT"
      className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  )
}
