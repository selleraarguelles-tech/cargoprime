'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, RefreshCw, ExternalLink, Trash2, Package, ChevronDown, ChevronUp, X, ClipboardCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Envio {
  id: number
  clienteId: number
  transportista: string
  trackingNumber: string
  descripcion: string | null
  fechaEsperada: Date | null
  estado: string
  ultimoEvento: string | null
  ultimaRevision: Date | null
  createdAt: Date
  cliente: { nombre: string }
}

interface Cliente { id: number; nombre: string }

interface TrackingResult {
  estado: string
  ultimoEvento: string
  ubicacion?: string
  fechaUltimoEvento?: string
  entregado: boolean
  eventos: { fecha: string; descripcion: string; ubicacion?: string }[]
  fuente: 'api' | 'url'
  trackingUrl: string
}

interface Props {
  envios: Envio[]
  clientes: Cliente[]
  transportistas: Record<string, { label: string }>
  isAdmin: boolean
  filters?: ReactNode
  hasActiveFilters?: boolean
}

export default function EnviosClient({ envios: initial, clientes, transportistas, isAdmin, filters, hasActiveFilters }: Props) {
  const router = useRouter()
  const [envios, setEnvios] = useState(initial)

  useEffect(() => {
    setEnvios(initial)
  }, [initial])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [trackingData, setTrackingData] = useState<Record<number, TrackingResult>>({})
  const [loadingTracking, setLoadingTracking] = useState<Record<number, boolean>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [form, setForm] = useState({
    clienteId: '',
    transportista: 'correos',
    trackingNumber: '',
    descripcion: '',
    fechaEsperada: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/envios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ clienteId: '', transportista: 'correos', trackingNumber: '', descripcion: '', fechaEsperada: '' })
      setShowForm(false)
      router.refresh()
      const data = await res.json()
      setEnvios(prev => [data, ...prev])
    }
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este envío?')) return
    await fetch(`/api/envios/${id}`, { method: 'DELETE' })
    setEnvios(prev => prev.filter(e => e.id !== id))
  }

  async function handleTracking(id: number) {
    setLoadingTracking(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/envios/${id}/tracking`)
      if (res.ok) {
        const data: TrackingResult = await res.json()
        setTrackingData(prev => ({ ...prev, [id]: data }))
        setEnvios(prev => prev.map(e => e.id === id ? { ...e, estado: data.estado, ultimoEvento: data.ultimoEvento, ultimaRevision: new Date() } : e))
        setExpanded(prev => ({ ...prev, [id]: true }))
      }
    } finally {
      setLoadingTracking(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Envíos entrantes</h1>
          <p className="text-sm text-gray-500 mt-1">Seguimiento de mercancía en camino al almacén</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo envío
          </button>
        )}
      </div>

      {filters}

      {/* Formulario nuevo envío */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Registrar envío entrante</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select
                required
                value={form.clienteId}
                onChange={e => setForm(p => ({ ...p, clienteId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transportista *</label>
              <select
                value={form.transportista}
                onChange={e => setForm(p => ({ ...p, transportista: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Object.entries(transportistas).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de tracking *</label>
              <input
                required
                type="text"
                value={form.trackingNumber}
                onChange={e => setForm(p => ({ ...p, trackingNumber: e.target.value }))}
                placeholder="Ej: 1Z999AA10123456784"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha esperada</label>
              <input
                type="date"
                value={form.fechaEsperada}
                onChange={e => setForm(p => ({ ...p, fechaEsperada: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Contenido</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Ej: 50 unidades SKU-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar envío'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de envíos */}
      {envios.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e4e8f0] p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {hasActiveFilters ? 'No se encontraron envíos con los filtros aplicados' : 'No hay envíos registrados'}
          </p>
          {isAdmin && !hasActiveFilters && <p className="text-gray-400 text-xs mt-1">Haz clic en &quot;Nuevo envío&quot; para registrar el primer envío</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {envios.map(envio => {
            const tracking = trackingData[envio.id]
            const isExpanded = expanded[envio.id]
            const isLoading = loadingTracking[envio.id]
            const hasApi = ['correos', 'gls'].includes(envio.transportista)

            return (
              <div key={envio.id} className="bg-white rounded-xl border border-[#e4e8f0] overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {transportistas[envio.transportista]?.label ?? envio.transportista}
                      </span>
                      <span className="font-mono text-sm text-gray-900">{envio.trackingNumber}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-sm text-gray-600">{envio.cliente.nombre}</span>
                    </div>
                    {envio.descripcion && (
                      <p className="text-xs text-gray-500 mt-1">{envio.descripcion}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {envio.fechaEsperada && (
                        <span className="text-xs text-gray-500">
                          Esperado: <span className="font-medium">{formatDate(envio.fechaEsperada)}</span>
                        </span>
                      )}
                      {(envio.ultimoEvento || envio.estado !== 'en_transito') && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {envio.estado}
                        </span>
                      )}
                      {envio.ultimaRevision && (
                        <span className="text-xs text-gray-400">
                          Revisado: {formatDate(envio.ultimaRevision)}
                        </span>
                      )}
                    </div>
                    {envio.ultimoEvento && (
                      <p className="text-xs text-gray-600 mt-1 italic">&quot;{envio.ultimoEvento}&quot;</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTracking(envio.id)}
                      disabled={isLoading}
                      title={hasApi ? 'Consultar estado en tiempo real' : 'Sólo disponible para Correos y GLS con API pública'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        hasApi
                          ? 'border-blue-200 text-blue-700 hover:bg-blue-50'
                          : 'border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      {isLoading ? 'Consultando...' : 'Actualizar'}
                    </button>
                    <a
                      href={tracking?.trackingUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => { if (!tracking) { e.preventDefault(); handleTracking(envio.id).then(() => {}) } }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver web
                    </a>
                    {tracking?.eventos && tracking.eventos.length > 0 && (
                      <button
                        onClick={() => setExpanded(prev => ({ ...prev, [envio.id]: !isExpanded }))}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <Link
                          href={`/envios/${envio.id}`}
                          title="Recepción: líneas esperadas y entrada a stock"
                          className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(envio.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Historial de eventos */}
                {isExpanded && tracking?.eventos && tracking.eventos.length > 0 && (
                  <div className="border-t border-gray-50 px-4 py-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Historial</p>
                    <div className="space-y-2">
                      {tracking.eventos.map((ev, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <span className="text-gray-400 shrink-0 w-32">{ev.fecha}</span>
                          <span className="text-gray-700">{ev.descripcion}</span>
                          {ev.ubicacion && <span className="text-gray-400">{ev.ubicacion}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
