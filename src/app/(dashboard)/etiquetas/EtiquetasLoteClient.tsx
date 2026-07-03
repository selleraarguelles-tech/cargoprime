'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, formatDate } from '@/lib/utils'
import { Tag, Printer, Layers, AlertCircle, X } from 'lucide-react'

interface PedidoRow {
  id: number
  amazonOrderId: string
  destinatarioNombre: string
  destinatarioCiudad: string
  destinatarioCP: string
  productoNombre: string
  estado: string
  createdAt: string
}

interface Props {
  pedidos: PedidoRow[]
}

export default function EtiquetasLoteClient({ pedidos }: Props) {
  const router = useRouter()
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const todosSeleccionados = pedidos.length > 0 && seleccion.size === pedidos.length

  function toggleTodos() {
    setSeleccion(todosSeleccionados ? new Set() : new Set(pedidos.map(p => p.id)))
  }

  function toggle(id: number) {
    setSeleccion(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function generarLote() {
    setLoading(true)
    setAviso(null)
    try {
      const res = await fetch('/api/pedidos/ctt-labels-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoIds: [...seleccion] }),
      })

      if (!res.ok) {
        const data = await res.json()
        setAviso({ tipo: 'error', texto: data.error ?? 'Error al generar el lote' })
        return
      }

      const generadas = res.headers.get('X-Lote-Generadas') ?? '0'
      const errores = parseInt(res.headers.get('X-Lote-Errores') ?? '0')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etiquetas-lote-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setAviso({
        tipo: errores > 0 ? 'error' : 'ok',
        texto: errores > 0
          ? `${generadas} etiquetas generadas · ${errores} con error (revisa los pedidos que siguen pendientes)`
          : `${generadas} etiquetas generadas correctamente en un solo PDF`,
      })
      setSeleccion(new Set())
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {seleccion.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Layers className="w-5 h-5 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800 flex-1">
            <strong>{seleccion.size}</strong> pedido{seleccion.size !== 1 ? 's' : ''} seleccionado{seleccion.size !== 1 ? 's' : ''} — las etiquetas se generan agrupadas por producto en un único PDF
          </p>
          <button
            onClick={generarLote}
            disabled={loading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 shrink-0"
          >
            <Printer className="w-4 h-4" />
            {loading ? 'Generando...' : `Generar ${seleccion.size} etiqueta${seleccion.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {aviso && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${aviso.tipo === 'ok' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={toggleTodos}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No hay pedidos pendientes de etiquetar
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => {
                  const estadoInfo = ESTADOS_PEDIDO[pedido.estado as keyof typeof ESTADOS_PEDIDO]
                  return (
                    <tr key={pedido.id} className={`transition-colors ${seleccion.has(pedido.id) ? 'bg-orange-50/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={seleccion.has(pedido.id)}
                          onChange={() => toggle(pedido.id)}
                          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{pedido.amazonOrderId}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{pedido.destinatarioNombre}</p>
                        <p className="text-xs text-gray-500">{pedido.destinatarioCiudad} {pedido.destinatarioCP}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{pedido.productoNombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(pedido.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={estadoInfo?.variant ?? 'default'}>{estadoInfo?.label ?? pedido.estado}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/etiquetas/${pedido.id}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
