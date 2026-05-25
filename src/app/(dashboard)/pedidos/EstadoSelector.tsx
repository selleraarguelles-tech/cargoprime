'use client'

import { useState } from 'react'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Props {
  pedidoId: number
  estadoActual: string
  isAdmin?: boolean
}

const SIGUIENTE_ESTADO: Record<string, string> = {
  sin_etiqueta: 'preparando',
  preparando: 'enviado',
  enviado: 'enviado',
}

export default function EstadoSelector({ pedidoId, estadoActual, isAdmin = false }: Props) {
  const [estado, setEstado] = useState(estadoActual)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const info = ESTADOS_PEDIDO[estado as keyof typeof ESTADOS_PEDIDO]
  const siguiente = SIGUIENTE_ESTADO[estado]

  async function avanzarEstado() {
    if (estado === 'enviado' || !isAdmin) return
    setLoading(true)
    const nuevoEstado = SIGUIENTE_ESTADO[estado]
    const res = await fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (res.ok) {
      setEstado(nuevoEstado)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={info?.variant ?? 'default'}>{info?.label ?? estado}</Badge>
      {isAdmin && estado !== 'enviado' && (
        <button
          onClick={avanzarEstado}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
          title={`Avanzar a: ${ESTADOS_PEDIDO[siguiente as keyof typeof ESTADOS_PEDIDO]?.label}`}
        >
          {loading ? '...' : '→'}
        </button>
      )}
    </div>
  )
}
