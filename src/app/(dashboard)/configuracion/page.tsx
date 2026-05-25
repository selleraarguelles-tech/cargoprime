'use client'

import { useState, useEffect } from 'react'
import { Settings, ShoppingBag, CheckCircle, AlertCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react'

export default function ConfiguracionPage() {
  const [form, setForm] = useState({
    amazon_app_id: '',
    amazon_lwa_client_id: '',
    amazon_lwa_client_secret: '',
    amazon_redirect_uri: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [uriSuggestion, setUriSuggestion] = useState('')

  useEffect(() => {
    fetch('/api/configuracion')
      .then(r => r.json())
      .then(data => {
        setForm(f => ({
          amazon_app_id: data.amazon_app_id ?? '',
          amazon_lwa_client_id: data.amazon_lwa_client_id ?? '',
          amazon_lwa_client_secret: data.amazon_lwa_client_secret ?? '',
          amazon_redirect_uri: data.amazon_redirect_uri ?? data.amazon_redirect_uri_suggestion ?? '',
        }))
        if (data.amazon_redirect_uri_suggestion) setUriSuggestion(data.amazon_redirect_uri_suggestion)
        setLoading(false)
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    const res = await fetch('/api/configuracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await res.json(); setError(d.error ?? 'Error al guardar') }
    setSaving(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  const isConfigured = !!(form.amazon_app_id && form.amazon_lwa_client_id && form.amazon_lwa_client_secret && form.amazon_redirect_uri)

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 font-mono"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Ajustes globales de la aplicación</p>
      </div>

      {/* Amazon SP-API */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-yellow-100 rounded-lg p-2">
            <ShoppingBag className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Amazon SP-API</h2>
            <p className="text-xs text-gray-500">Credenciales de tu aplicación de desarrollador de Amazon</p>
          </div>
          {isConfigured && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Configurado
            </span>
          )}
        </div>

        {/* Step-by-step guide */}
        <div className="px-6 pt-5 pb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-blue-900 mb-3">Cómo obtener las credenciales (solo una vez)</p>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold shrink-0">1.</span>
                <span>
                  Entra en{' '}
                  <a href="https://sellercentral.amazon.es/apps/develop" target="_blank" rel="noreferrer"
                    className="underline font-medium inline-flex items-center gap-1">
                    Seller Central → Aplicaciones y Servicios → Desarrollar apps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">2.</span>
                <span>Clic en <strong>"Añadir nueva app key"</strong> → Tipo: <strong>"Desarrollador privado"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">3.</span>
                <span>En la pestaña <strong>"Datos de la aplicación"</strong> encontrarás el <strong>App ID</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">4.</span>
                <span>En la pestaña <strong>"Credenciales LWA"</strong> encontrarás el <strong>Client ID</strong> y <strong>Client Secret</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">5.</span>
                <span>
                  En <strong>"URLs de redireccionamiento autorizadas"</strong> añade exactamente esta URL:
                  {uriSuggestion && (
                    <span className="flex items-center gap-2 mt-1">
                      <code className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded text-xs">{uriSuggestion}</code>
                      <button onClick={() => copyToClipboard(uriSuggestion)} className="text-blue-600 hover:text-blue-800">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </span>
              </li>
            </ol>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>App ID</label>
                <input
                  value={form.amazon_app_id}
                  onChange={e => setForm(f => ({ ...f, amazon_app_id: e.target.value }))}
                  placeholder="amzn1.sp.solution.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>LWA Client ID</label>
                <input
                  value={form.amazon_lwa_client_id}
                  onChange={e => setForm(f => ({ ...f, amazon_lwa_client_id: e.target.value }))}
                  placeholder="amzn1.application-oa2-client.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>LWA Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={form.amazon_lwa_client_secret}
                    onChange={e => setForm(f => ({ ...f, amazon_lwa_client_secret: e.target.value }))}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>URL de Callback (Redirect URI)</label>
                <div className="flex gap-2">
                  <input
                    value={form.amazon_redirect_uri}
                    onChange={e => setForm(f => ({ ...f, amazon_redirect_uri: e.target.value }))}
                    placeholder="https://tu-dominio.com/api/amazon/callback"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(form.amazon_redirect_uri)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 shrink-0"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Esta URL debe estar registrada exactamente en tu aplicación de Amazon.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 shrink-0" />Configuración guardada correctamente
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">
                  Las credenciales se guardan de forma segura en la base de datos.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* General app info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 rounded-lg p-2">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Información del sistema</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Versión</span>
            <span className="font-medium text-gray-700">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Base de datos</span>
            <span className="font-medium text-gray-700">SQLite (local)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-500">SP-API</span>
            <span className={`font-medium ${isConfigured ? 'text-green-600' : 'text-gray-400'}`}>
              {isConfigured ? 'Configurado' : 'Sin configurar'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
