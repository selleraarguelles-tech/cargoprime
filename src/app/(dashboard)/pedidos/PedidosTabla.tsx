'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { ESTADOS_PEDIDO, ESTADOS_TRACKING, CANALES, formatDate } from '@/lib/utils'
import { Search, Tag, Printer, Layers, X, CheckCircle, AlertCircle } from 'lucide-react'
import EstadoSelector from './EstadoSelector'
import TrackingRefresh from './TrackingRefresh'

interface PedidoRow {
  id: number
  amazonOrderId: string
  canal: string
  clienteNombre: string
  destinatarioNombre: string
  destinatarioCiudad: string
  destinatarioCP: string
  productoNombre: string
  createdAt: string
  estado: string
  trackingNumber: string | null
  transportista: string | null
  trackingEstado: string | null
}

interface Conteos { total: number; sin_etiqueta: number; preparando: number; enviado: number }

interface Props {
  pedidos: PedidoRow[]
  isAdmin: boolean
  estadoActivo?: string
  conteos: Conteos
}

const FLUJO: { key: string; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'sin_etiqueta', label: 'Sin etiqueta' },
  { key: 'preparando', label: 'Preparando' },
  { key: 'enviado', label: 'Enviados' },
]

export default function PedidosTabla({ pedidos, isAdmin, estadoActivo, conteos }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const todos = pedidos.length > 0 && sel.size === pedidos.length

  function conteoDe(key: string) {
    if (key === '') return conteos.total
    return conteos[key as keyof Conteos] as number
  }

  function filtrarEstado(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (key) params.set('estado', key)
    else params.delete('estado')
    router.push(`/pedidos?${params.toString()}`)
  }

  function toggle(id: number) {
    setSel(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function generarLote() {
    setLoading(true); setAviso(null)
    try {
      const res = await fetch('/api/pedidos/ctt-labels-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoIds: [...sel] }),
      })
      if (!res.ok) {
        const d = await res.json()
        setAviso({ tipo: 'error', texto: d.error ?? 'Error al generar las etiquetas' })
        return
      }
      const generadas = res.headers.get('X-Lote-Generadas') ?? '0'
      const errores = parseInt(res.headers.get('X-Lote-Errores') ?? '0')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etiquetas-lote-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      setAviso({
        tipo: errores > 0 ? 'error' : 'ok',
        texto: errores > 0 ? `${generadas} etiquetas generadas · ${errores} con error` : `${generadas} etiquetas generadas en un solo PDF`,
      })
      setSel(new Set())
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Barra de flujo de estados (filtro rápido) */}
      <div className="flex gap-2 flex-wrap">
        {FLUJO.map(f => {
          const activo = (estadoActivo ?? '') === f.key
          return (
            <button
              key={f.key}
              onClick={() => filtrarEstado(f.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                activo ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activo ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {conteoDe(f.key)}
              </span>
            </button>
          )
        })}
      </div>

      {aviso && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${aviso.tipo === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
          {aviso.tipo === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
          <table className="w-full text-sm tbl-head tbl-zebra">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={todos} onChange={() => setSel(todos ? new Set() : new Set(pedidos.map(p => p.id)))} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300" />
                </th>
                {['Nº Pedido', 'Canal', 'Cliente', 'Destinatario', 'Producto', 'Fecha', 'Estado', 'Seguimiento', 'Estado envío', 'Etiqueta'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No se encontraron pedidos con los filtros aplicados
                  </td>
                </tr>
              ) : (
                pedidos.map(pedido => {
                  const estadoInfo = ESTADOS_PEDIDO[pedido.estado as keyof typeof ESTADOS_PEDIDO]
                  const canalInfo = CANALES[pedido.canal]
                  const seleccionado = sel.has(pedido.id)
                  return (
                    <tr key={pedido.id} className={`border-b border-gray-50 transition-colors ${seleccionado ? '!bg-orange-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={seleccionado} onChange={() => toggle(pedido.id)} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{pedido.amazonOrderId}</td>
                      <td className="px-4 py-3"><Badge variant={canalInfo?.variant ?? 'default'}>{canalInfo?.label ?? pedido.canal}</Badge></td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{pedido.clienteNombre}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{pedido.destinatarioNombre}</p>
                        <p className="text-xs text-gray-500">{pedido.destinatarioCiudad} {pedido.destinatarioCP}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[220px] truncate" title={pedido.productoNombre}>{pedido.productoNombre}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(pedido.createdAt)}</td>
                      <td className="px-4 py-3"><EstadoSelector pedidoId={pedido.id} estadoActual={pedido.estado} isAdmin={isAdmin} /></td>
                      <td className="px-4 py-3 text-xs">
                        {pedido.trackingNumber ? (
                          <>
                            <p className="font-mono text-slate-700">{pedido.trackingNumber}</p>
                            {pedido.transportista && <p className="text-gray-400">{pedido.transportista}</p>}
                          </>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {pedido.trackingEstado ? (() => {
                            const ti = ESTADOS_TRACKING[pedido.trackingEstado!]
                            return <Badge variant={ti?.variant ?? 'default'}>{ti?.label ?? pedido.trackingEstado}</Badge>
                          })() : <span className="text-gray-300 text-xs">—</span>}
                          {(!pedido.transportista || /ctt/i.test(pedido.transportista)) && (
                            <TrackingRefresh pedidoId={pedido.id} tieneTracking={!!pedido.trackingNumber} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/etiquetas/${pedido.id}`} className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium">
                          <Tag className="w-3.5 h-3.5" /> Ver
                        </Link>
                        <span className="sr-only">{estadoInfo?.label}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barra flotante de selección */}
      {sel.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1526] text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
          <span className="flex items-center gap-2 text-sm">
            <Layers className="w-4 h-4 text-[#e0b437]" />
            <strong>{sel.size}</strong> seleccionado{sel.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={generarLote}
            disabled={loading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Printer className="w-4 h-4" />
            {loading ? 'Generando...' : `Generar ${sel.size} etiqueta${sel.size !== 1 ? 's' : ''}`}
          </button>
          <button onClick={() => setSel(new Set())} className="text-slate-400 hover:text-white" title="Deseleccionar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
