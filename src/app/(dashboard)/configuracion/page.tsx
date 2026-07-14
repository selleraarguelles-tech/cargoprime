'use client'

import { useState, useEffect } from 'react'
import { Settings, ShoppingBag, CheckCircle, AlertCircle, ExternalLink, Copy, Eye, EyeOff, Truck, Music2, Store, Mail } from 'lucide-react'

export default function ConfiguracionPage() {
  const [form, setForm] = useState({
    amazon_app_id: '',
    amazon_lwa_client_id: '',
    amazon_lwa_client_secret: '',
    amazon_redirect_uri: '',
    ctt_client_id: '',
    ctt_client_secret: '',
    ctt_username: '',
    ctt_password: '',
    ctt_client_center_code: '',
    ctt_sandbox: 'true',
    ctt_sender_name: '',
    ctt_sender_address: '',
    ctt_sender_postal_code: '',
    ctt_sender_town: '',
    ctt_sender_country_code: 'ES',
    ctt_sender_email: '',
    ctt_sender_phone: '',
    tiktok_app_key: '',
    tiktok_app_secret: '',
    tiktok_redirect_uri: '',
    smtp_host: '',
    smtp_port: '465',
    smtp_secure: 'true',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [uriSuggestion, setUriSuggestion] = useState('')
  const [tiktokUriSuggestion, setTiktokUriSuggestion] = useState('')
  const [probandoEmail, setProbandoEmail] = useState(false)
  const [resultadoEmail, setResultadoEmail] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    fetch('/api/configuracion')
      .then(r => r.json())
      .then(data => {
        setForm(f => ({
          amazon_app_id: data.amazon_app_id ?? '',
          amazon_lwa_client_id: data.amazon_lwa_client_id ?? '',
          amazon_lwa_client_secret: data.amazon_lwa_client_secret ?? '',
          amazon_redirect_uri: data.amazon_redirect_uri ?? data.amazon_redirect_uri_suggestion ?? '',
          ctt_client_id: data.ctt_client_id ?? '',
          ctt_client_secret: data.ctt_client_secret ?? '',
          ctt_username: data.ctt_username ?? '',
          ctt_password: data.ctt_password ?? '',
          ctt_client_center_code: data.ctt_client_center_code ?? '',
          ctt_sandbox: data.ctt_sandbox ?? 'true',
          ctt_sender_name: data.ctt_sender_name ?? '',
          ctt_sender_address: data.ctt_sender_address ?? '',
          ctt_sender_postal_code: data.ctt_sender_postal_code ?? '',
          ctt_sender_town: data.ctt_sender_town ?? '',
          ctt_sender_country_code: data.ctt_sender_country_code ?? 'ES',
          ctt_sender_email: data.ctt_sender_email ?? '',
          ctt_sender_phone: data.ctt_sender_phone ?? '',
          tiktok_app_key: data.tiktok_app_key ?? '',
          tiktok_app_secret: data.tiktok_app_secret ?? '',
          tiktok_redirect_uri: data.tiktok_redirect_uri ?? data.tiktok_redirect_uri_suggestion ?? '',
          smtp_host: data.smtp_host ?? '',
          smtp_port: data.smtp_port ?? '465',
          smtp_secure: data.smtp_secure ?? 'true',
          smtp_user: data.smtp_user ?? '',
          smtp_pass: data.smtp_pass ?? '',
          smtp_from: data.smtp_from ?? '',
        }))
        if (data.amazon_redirect_uri_suggestion) setUriSuggestion(data.amazon_redirect_uri_suggestion)
        if (data.tiktok_redirect_uri_suggestion) setTiktokUriSuggestion(data.tiktok_redirect_uri_suggestion)
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

  // Guarda la configuración y envía un correo de prueba al propio buzón.
  async function guardarYProbarEmail() {
    setProbandoEmail(true)
    setResultadoEmail(null)
    try {
      const save = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!save.ok) {
        setResultadoEmail({ ok: false, texto: 'No se pudo guardar la configuración' })
        return
      }
      const destino = form.smtp_user || 'info@cargoprime.es'
      const res = await fetch(`/api/email/test?to=${encodeURIComponent(destino)}`)
      const d = await res.json()
      if (d.enviado) setResultadoEmail({ ok: true, texto: `Correo de prueba enviado a ${destino}. Revisa la bandeja.` })
      else if (d.configurado === false) setResultadoEmail({ ok: false, texto: 'Faltan datos: rellena servidor, usuario y contraseña.' })
      else setResultadoEmail({ ok: false, texto: `Fallo al enviar: ${d.error ?? 'error desconocido'}` })
    } catch {
      setResultadoEmail({ ok: false, texto: 'Error de conexión al probar' })
    } finally {
      setProbandoEmail(false)
    }
  }

  const isConfigured = !!(form.amazon_app_id && form.amazon_lwa_client_id && form.amazon_lwa_client_secret && form.amazon_redirect_uri)

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 font-mono"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
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

      {/* TikTok Shop */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-gray-100 rounded-lg p-2">
            <Music2 className="w-5 h-5 text-gray-700" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">TikTok Shop</h2>
            <p className="text-xs text-gray-500">Credenciales de tu app del TikTok Shop Partner Center</p>
          </div>
          {form.tiktok_app_key && form.tiktok_app_secret && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Configurado
            </span>
          )}
        </div>
        <div className="px-6 pt-5 pb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-blue-900 mb-3">Cómo obtener las credenciales</p>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold shrink-0">1.</span>
                <span>
                  Entra en{' '}
                  <a href="https://partner.tiktokshop.com" target="_blank" rel="noreferrer"
                    className="underline font-medium inline-flex items-center gap-1">
                    TikTok Shop Partner Center
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {' '}y crea una app
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">2.</span>
                <span>Copia el <strong>App Key</strong> y el <strong>App Secret</strong> de tu app</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">3.</span>
                <span>
                  Añade esta URL de redirección en la configuración de la app:
                  {tiktokUriSuggestion && (
                    <span className="flex items-center gap-2 mt-1">
                      <code className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded text-xs">{tiktokUriSuggestion}</code>
                      <button onClick={() => copyToClipboard(tiktokUriSuggestion)} className="text-blue-600 hover:text-blue-800">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </span>
              </li>
            </ol>
          </div>

          {!loading && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>App Key</label>
                <input
                  value={form.tiktok_app_key}
                  onChange={e => setForm(f => ({ ...f, tiktok_app_key: e.target.value }))}
                  placeholder="6abc123def456..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>App Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={form.tiktok_app_secret}
                    onChange={e => setForm(f => ({ ...f, tiktok_app_secret: e.target.value }))}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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

              <div className="flex justify-end pt-1">
                <button type="submit" disabled={saving} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Shopify */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 rounded-lg p-2">
            <Store className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Shopify</h2>
            <p className="text-xs text-gray-500">
              No requiere configuración global: cada tienda se conecta desde{' '}
              <a href="/cuentas-shopify" className="underline font-medium">Cuentas Shopify</a> con su propio Access Token.
            </p>
          </div>
        </div>
      </div>

      {/* CTT Express */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-red-100 rounded-lg p-2">
            <Truck className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">CTT Express</h2>
            <p className="text-xs text-gray-500">Credenciales para crear envíos y descargar etiquetas directamente desde los pedidos</p>
          </div>
          {form.ctt_client_id && form.ctt_sender_name && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Configurado
            </span>
          )}
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Entorno */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Entorno</label>
            <select
              value={form.ctt_sandbox}
              onChange={e => setForm(f => ({ ...f, ctt_sandbox: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="true">UAT (pruebas)</option>
              <option value="false">Producción</option>
            </select>
          </div>

          {/* Credenciales API */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Credenciales API</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Client ID</label>
                <input value={form.ctt_client_id} onChange={e => setForm(f => ({ ...f, ctt_client_id: e.target.value }))} className={inputClass} placeholder="4l9aip2m3l0e..." />
              </div>
              <div>
                <label className={labelClass}>Client Center Code</label>
                <input value={form.ctt_client_center_code} onChange={e => setForm(f => ({ ...f, ctt_client_center_code: e.target.value }))} className={inputClass} placeholder="4671400001" />
              </div>
              <div>
                <label className={labelClass}>Client Secret</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} value={form.ctt_client_secret} onChange={e => setForm(f => ({ ...f, ctt_client_secret: e.target.value }))} className={`${inputClass} pr-10`} placeholder="••••••••••••" />
                  <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Usuario</label>
                  <input value={form.ctt_username} onChange={e => setForm(f => ({ ...f, ctt_username: e.target.value }))} className={inputClass} placeholder="user1" />
                </div>
                <div>
                  <label className={labelClass}>Contraseña</label>
                  <input type={showSecret ? 'text' : 'password'} value={form.ctt_password} onChange={e => setForm(f => ({ ...f, ctt_password: e.target.value }))} className={inputClass} placeholder="••••••" />
                </div>
              </div>
            </div>
          </div>

          {/* Datos del remitente (almacén) */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Datos del almacén (remitente)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Nombre del remitente</label>
                <input value={form.ctt_sender_name} onChange={e => setForm(f => ({ ...f, ctt_sender_name: e.target.value }))} className={inputClass} placeholder="Almacén FBA" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Dirección</label>
                <input value={form.ctt_sender_address} onChange={e => setForm(f => ({ ...f, ctt_sender_address: e.target.value }))} className={inputClass} placeholder="Calle Mayor 10" />
              </div>
              <div>
                <label className={labelClass}>Código postal</label>
                <input value={form.ctt_sender_postal_code} onChange={e => setForm(f => ({ ...f, ctt_sender_postal_code: e.target.value }))} className={inputClass} placeholder="05001" />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input value={form.ctt_sender_town} onChange={e => setForm(f => ({ ...f, ctt_sender_town: e.target.value }))} className={inputClass} placeholder="Ávila" />
              </div>
              <div>
                <label className={labelClass}>País</label>
                <input value={form.ctt_sender_country_code} onChange={e => setForm(f => ({ ...f, ctt_sender_country_code: e.target.value }))} className={inputClass} placeholder="ES" maxLength={2} />
              </div>
              <div>
                <label className={labelClass}>Teléfono (opcional)</label>
                <input value={form.ctt_sender_phone} onChange={e => setForm(f => ({ ...f, ctt_sender_phone: e.target.value }))} className={inputClass} placeholder="+34 999999999" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Email de notificación (opcional)</label>
                <input value={form.ctt_sender_email} onChange={e => setForm(f => ({ ...f, ctt_sender_email: e.target.value }))} className={inputClass} placeholder="almacen@ejemplo.com" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Correo (SMTP) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-sky-100 rounded-lg p-2">
            <Mail className="w-5 h-5 text-sky-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Correo (SMTP)</h2>
            <p className="text-xs text-gray-500">Para los avisos diarios: retrasos +36h, reclamaciones a CTT y stock bajo</p>
          </div>
          {form.smtp_host && form.smtp_user && form.smtp_pass && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Configurado
            </span>
          )}
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Servidor SMTP</label>
              <input value={form.smtp_host} onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))} className={inputClass} placeholder="smtp.hostinger.com" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Puerto</label>
                <input value={form.smtp_port} onChange={e => setForm(f => ({ ...f, smtp_port: e.target.value }))} className={inputClass} placeholder="465" />
              </div>
              <div>
                <label className={labelClass}>Seguro (SSL)</label>
                <select value={form.smtp_secure} onChange={e => setForm(f => ({ ...f, smtp_secure: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="true">Sí (465)</option>
                  <option value="false">No (587)</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Usuario (email)</label>
              <input value={form.smtp_user} onChange={e => setForm(f => ({ ...f, smtp_user: e.target.value }))} className={inputClass} placeholder="info@cargoprime.es" />
            </div>
            <div>
              <label className={labelClass}>Contraseña del buzón</label>
              <div className="relative">
                <input type={showSecret ? 'text' : 'password'} value={form.smtp_pass} onChange={e => setForm(f => ({ ...f, smtp_pass: e.target.value }))} className={`${inputClass} pr-10`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Remitente</label>
              <input value={form.smtp_from} onChange={e => setForm(f => ({ ...f, smtp_from: e.target.value }))} className={inputClass} placeholder="CargoPrime <info@cargoprime.es>" />
            </div>
          </div>

          {resultadoEmail && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${resultadoEmail.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {resultadoEmail.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {resultadoEmail.texto}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">Se guarda en la base de datos, como Amazon y CTT.</p>
            <div className="flex gap-2">
              <button onClick={guardarYProbarEmail} disabled={probandoEmail} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {probandoEmail ? 'Probando...' : 'Guardar y probar envío'}
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
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
