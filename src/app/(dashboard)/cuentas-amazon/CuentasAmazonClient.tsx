'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ShoppingBag, Plus, Trash2, RefreshCw, Link2, AlertCircle, CheckCircle, X, Settings, Pencil } from 'lucide-react'
import { MARKETPLACES } from '@/lib/spapi'
import { formatDateTime } from '@/lib/utils'

interface Cuenta {
  id: number
  nombre: string
  sellerId: string
  marketplaceId: string
  clienteId: number
  clienteNombre: string
  activo: boolean
  isSandbox: boolean
  createdAt: string
}

interface Cliente {
  id: number
  nombre: string
}

interface Props {
  cuentas: Cuenta[]
  clientes: Cliente[]
  configured: boolean
}

interface SyncResult {
  ok: boolean
  totalAmazon: number
  creados: number
  actualizados: number
  omitidos: number
  errores: string[]
}

const emptyForm = {
  nombre: '',
  sellerId: '',
  marketplaceId: 'A1RKKUPIHCS9HS',
  clienteId: '',
  refreshToken: '',
  isSandbox: false,
}

function CuentasAmazonInner({ cuentas: initial, clientes, configured }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const setupParam = searchParams.get('setup')
  const sellerIdParam = searchParams.get('sellerId')
  const tokenParam = searchParams.get('token')

  const [cuentas, setCuentas] = useState(initial)
  const [modal, setModal] = useState<'manual' | 'setup' | 'edit' | null>(setupParam === '1' ? 'setup' : null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState<number | null>(null)
  const [syncResult, setSyncResult] = useState<{ id: number; result: SyncResult } | null>(null)
  const [error, setError] = useState(errorParam ?? '')
  const [form, setForm] = useState({
    ...emptyForm,
    sellerId: sellerIdParam ?? '',
    refreshToken: tokenParam ?? '',
  })

  function close() {
    setModal(null)
    setEditingId(null)
    setError('')
    setForm({ ...emptyForm })
    router.replace('/cuentas-amazon')
  }

  function openEditar(c: Cuenta) {
    setForm({
      nombre: c.nombre,
      sellerId: c.sellerId,
      marketplaceId: c.marketplaceId,
      clienteId: String(c.clienteId),
      refreshToken: '',
      isSandbox: c.isSandbox,
    })
    setEditingId(c.id)
    setModal('edit')
    setError('')
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const isEdit = modal === 'edit' && editingId !== null
    const res = await fetch('/api/amazon/cuentas', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? { ...form, id: editingId } : form),
    })
    const data = await res.json()
    if (res.ok) {
      close()
      router.refresh()
    } else {
      setError(data.error ?? 'Error al guardar')
    }
    setLoading(false)
  }

  async function handleEliminar(id: number, nombre: string) {
    if (!confirm(`¿Eliminar la cuenta "${nombre}"? Los pedidos sincronizados no se borrarán.`)) return
    await fetch('/api/amazon/cuentas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCuentas(c => c.filter(x => x.id !== id))
  }

  async function handleSincronizar(id: number) {
    setSyncLoading(id); setSyncResult(null)
    const res = await fetch('/api/amazon/sincronizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuentaId: id }),
    })
    const data = await res.json()
    setSyncResult({ id, result: data })
    setSyncLoading(null)
    if (res.ok && (data.creados > 0 || data.actualizados > 0)) router.refresh()
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"
  const isEdit = modal === 'edit'

  const marketplaceNombre = (id: string) =>
    Object.values(MARKETPLACES).find(m => m.id === id)?.nombre ?? id

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cuentas Amazon</h1>
          <p className="text-gray-500 text-sm mt-1">Conecta tus cuentas de Seller Central para sincronizar pedidos y etiquetas</p>
        </div>
        <div className="flex gap-2">
          {configured && (
            <a
              href="/api/amazon/connect"
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Link2 className="w-4 h-4" />
              Conectar con Amazon
            </a>
          )}
          <button
            onClick={() => { setModal('manual'); setError('') }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir manual
          </button>
        </div>
      </div>

      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-amber-800">Primero configura tu aplicación Amazon SP-API</p>
            <p className="text-amber-700 mt-1">
              Necesitas registrar una aplicación de desarrollador en Amazon una sola vez.
            </p>
            <a
              href="/configuracion"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Ir a Configuración
            </a>
          </div>
        </div>
      )}

      {errorParam && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold">Error al conectar con Amazon</p>
            <p className="mt-0.5">{decodeURIComponent(errorParam)}</p>
          </div>
        </div>
      )}

      {cuentas.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e4e8f0] shadow-sm p-12 text-center">
          <div className="bg-orange-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Sin cuentas conectadas</h3>
          <p className="text-sm text-gray-500">Conecta tu primera cuenta de Amazon Seller Central para empezar a sincronizar pedidos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] overflow-hidden">
          <table className="w-full text-sm tbl-head tbl-zebra">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cuenta</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Seller ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Marketplace</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Añadida</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cuentas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {c.nombre}
                      {c.isSandbox && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">sandbox</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.sellerId}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{marketplaceNombre(c.marketplaceId)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.clienteNombre}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSincronizar(c.id)}
                        disabled={syncLoading === c.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Sincronizar pedidos"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncLoading === c.id ? 'animate-spin' : ''}`} />
                        {syncLoading === c.id ? 'Sincronizando...' : 'Sincronizar'}
                      </button>
                      <button
                        onClick={() => openEditar(c)}
                        className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                        title="Editar cuenta"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminar(c.id, c.nombre)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {syncResult && (
        <div className={`rounded-xl p-4 flex gap-3 ${syncResult.result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {syncResult.result.ok ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <div className="text-sm flex-1">
            {syncResult.result.ok ? (
              <>
                <p className="font-semibold text-green-800">Sincronización completada</p>
                <p className="text-green-700 mt-0.5">
                  {syncResult.result.totalAmazon} pedidos en Amazon ·{' '}
                  <strong>{syncResult.result.creados} nuevos importados</strong> ·{' '}
                  {syncResult.result.actualizados} con tracking actualizado ·{' '}
                  {syncResult.result.omitidos} ya existían
                </p>
                {syncResult.result.errores.length > 0 && (
                  <p className="text-amber-700 mt-1 text-xs">Errores: {syncResult.result.errores.join(', ')}</p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-red-800">Error al sincronizar</p>
                <p className="text-red-700 mt-0.5">{(syncResult.result as unknown as { error: string }).error}</p>
              </>
            )}
          </div>
          <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] p-6">
        <h3 className="font-semibold text-gray-900 mb-4">¿Cómo funciona?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { num: '1', title: 'Conecta tu cuenta', desc: 'Usa OAuth automático o añade manualmente el Refresh Token de tu app SP-API.' },
            { num: '2', title: 'Sincroniza pedidos', desc: 'Importa automáticamente tus pedidos FBM pendientes de los últimos 30 días.' },
            { num: '3', title: 'Imprime etiquetas', desc: 'Los pedidos importados aparecen en la cola de etiquetas listos para imprimir.' },
          ].map(step => (
            <div key={step.num} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center shrink-0">
                {step.num}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{step.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(modal === 'manual' || modal === 'setup' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {isEdit ? 'Editar cuenta Amazon' : modal === 'setup' ? 'Completar configuración' : 'Añadir cuenta Amazon'}
                </h2>
                {modal === 'setup' && (
                  <p className="text-xs text-gray-500 mt-0.5">Amazon ha autorizado la app. Completa los datos.</p>
                )}
                {isEdit && (
                  <p className="text-xs text-gray-500 mt-0.5">Deja el Refresh Token vacío para no cambiarlo.</p>
                )}
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Nombre de la cuenta *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required
                  placeholder="Ej: Mi Tienda España"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Seller ID *</label>
                  <input
                    value={form.sellerId}
                    onChange={e => setForm(f => ({ ...f, sellerId: e.target.value }))}
                    required
                    placeholder="A1B2C3D4E5F6G7"
                    className={`${inputClass} font-mono`}
                    readOnly={modal === 'setup'}
                  />
                </div>
                <div>
                  <label className={labelClass}>Marketplace *</label>
                  <select
                    value={form.marketplaceId}
                    onChange={e => setForm(f => ({ ...f, marketplaceId: e.target.value }))}
                    required
                    className={inputClass}
                  >
                    {Object.entries(MARKETPLACES).map(([key, m]) => (
                      <option key={m.id} value={m.id}>{key}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Cliente asociado *</label>
                <select
                  value={form.clienteId}
                  onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))}
                  required
                  className={inputClass}
                >
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Los pedidos de esta cuenta se asignarán a este cliente.</p>
              </div>
              <div>
                <label className={labelClass}>Refresh Token {isEdit ? '' : '*'}</label>
                <textarea
                  value={form.refreshToken}
                  onChange={e => setForm(f => ({ ...f, refreshToken: e.target.value }))}
                  required={!isEdit}
                  rows={3}
                  placeholder={isEdit ? 'Dejar vacío para mantener el actual' : 'Atzr|...'}
                  className={`${inputClass} font-mono text-xs resize-none`}
                  readOnly={modal === 'setup'}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSandbox"
                  checked={form.isSandbox}
                  onChange={e => setForm(f => ({ ...f, isSandbox: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-300"
                />
                <label htmlFor="isSandbox" className="text-sm text-gray-700">
                  Entorno de pruebas (sandbox)
                </label>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                  {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CuentasAmazonClient(props: Props) {
  return (
    <Suspense>
      <CuentasAmazonInner {...props} />
    </Suspense>
  )
}
