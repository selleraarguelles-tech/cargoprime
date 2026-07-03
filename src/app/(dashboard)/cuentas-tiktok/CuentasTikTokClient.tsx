'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Music2, Trash2, RefreshCw, Link2, AlertCircle, CheckCircle, X, Settings } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Cuenta {
  id: number
  nombre: string
  shopId: string
  clienteId: number
  clienteNombre: string
  activo: boolean
  createdAt: string
}

interface Cliente { id: number; nombre: string }

interface Props {
  cuentas: Cuenta[]
  clientes: Cliente[]
  configured: boolean
}

interface SyncResult {
  ok: boolean
  totalTikTok: number
  creados: number
  omitidos: number
  errores: string[]
}

const emptyForm = { nombre: '', shopId: '', shopCipher: '', clienteId: '', accessToken: '', refreshToken: '' }

function CuentasTikTokInner({ cuentas: initial, clientes, configured }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const setupParam = searchParams.get('setup')

  const [cuentas, setCuentas] = useState(initial)
  const [modal, setModal] = useState<'setup' | null>(setupParam === '1' ? 'setup' : null)
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState<number | null>(null)
  const [syncResult, setSyncResult] = useState<{ id: number; result: SyncResult } | null>(null)
  const [error, setError] = useState(errorParam ?? '')
  const [form, setForm] = useState({
    ...emptyForm,
    shopId: searchParams.get('shopId') ?? '',
    shopCipher: searchParams.get('shopCipher') ?? '',
    nombre: searchParams.get('nombre') ?? '',
    accessToken: searchParams.get('accessToken') ?? '',
    refreshToken: searchParams.get('refreshToken') ?? '',
  })

  function close() {
    setModal(null); setError(''); setForm({ ...emptyForm })
    router.replace('/cuentas-tiktok')
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/tiktok/cuentas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) { close(); router.refresh() } else { setError(data.error ?? 'Error al guardar') }
    setLoading(false)
  }

  async function handleEliminar(id: number, nombre: string) {
    if (!confirm(`¿Eliminar la cuenta "${nombre}"? Los pedidos sincronizados no se borrarán.`)) return
    await fetch('/api/tiktok/cuentas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setCuentas(c => c.filter(x => x.id !== id))
  }

  async function handleSincronizar(id: number) {
    setSyncLoading(id); setSyncResult(null)
    const res = await fetch('/api/tiktok/sincronizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuentaId: id }),
    })
    const data = await res.json()
    setSyncResult({ id, result: data })
    setSyncLoading(null)
    if (res.ok && data.creados > 0) router.refresh()
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas TikTok Shop</h1>
          <p className="text-gray-500 text-sm mt-1">Conecta tus tiendas de TikTok Shop para sincronizar pedidos</p>
        </div>
        {configured && (
          <a
            href="/api/tiktok/connect"
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Conectar con TikTok Shop
          </a>
        )}
      </div>

      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-amber-800">Primero configura tu aplicación de TikTok Shop Partner Center</p>
            <p className="text-amber-700 mt-1">
              Necesitas registrar una app en el TikTok Shop Partner Center y añadir el App Key / App Secret en Configuración.
            </p>
            <a href="/configuracion" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
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
            <p className="font-semibold">Error al conectar con TikTok Shop</p>
            <p className="mt-0.5">{decodeURIComponent(errorParam)}</p>
          </div>
        </div>
      )}

      {cuentas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="bg-gray-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Music2 className="w-8 h-8 text-gray-700" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Sin tiendas conectadas</h3>
          <p className="text-sm text-gray-500">Conecta tu primera tienda de TikTok Shop para empezar a sincronizar pedidos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tienda</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Shop ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Añadida</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cuentas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {c.nombre}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.shopId}</td>
                  <td className="px-4 py-3 text-gray-600">{c.clienteNombre}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSincronizar(c.id)}
                        disabled={syncLoading === c.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncLoading === c.id ? 'animate-spin' : ''}`} />
                        {syncLoading === c.id ? 'Sincronizando...' : 'Sincronizar'}
                      </button>
                      <button
                        onClick={() => handleEliminar(c.id, c.nombre)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
          {syncResult.result.ok ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
          <div className="text-sm flex-1">
            {syncResult.result.ok ? (
              <>
                <p className="font-semibold text-green-800">Sincronización completada</p>
                <p className="text-green-700 mt-0.5">
                  {syncResult.result.totalTikTok} pedidos en TikTok Shop ·{' '}
                  <strong>{syncResult.result.creados} nuevos importados</strong> ·{' '}
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
          <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {modal === 'setup' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Completar configuración</h2>
                <p className="text-xs text-gray-500 mt-0.5">TikTok Shop ha autorizado la app. Completa los datos.</p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Nombre de la tienda *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Shop ID</label>
                <input value={form.shopId} readOnly className={`${inputClass} font-mono text-xs bg-gray-50`} />
              </div>
              <div>
                <label className={labelClass}>Cliente asociado *</label>
                <select value={form.clienteId} onChange={e => setForm(f => ({ ...f, clienteId: e.target.value }))} required className={inputClass}>
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Los pedidos de esta tienda se asignarán a este cliente.</p>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                  {loading ? 'Guardando...' : 'Guardar tienda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CuentasTikTokClient(props: Props) {
  return (
    <Suspense>
      <CuentasTikTokInner {...props} />
    </Suspense>
  )
}
