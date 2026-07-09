'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ShieldAlert, Smartphone, Copy, Check, AlertCircle } from 'lucide-react'

export default function SeguridadClient({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [disabling, setDisabling] = useState(false)

  async function iniciarAlta() {
    setLoading(true); setError('')
    const res = await fetch('/api/2fa/setup', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'No se pudo iniciar'); return }
    setQr(data.qr); setSecret(data.secret)
  }

  async function activar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/2fa/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Código incorrecto'); return }
    setQr(''); setSecret(''); setCode('')
    router.refresh()
  }

  async function desactivar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Código incorrecto'); return }
    setDisabling(false); setCode('')
    router.refresh()
  }

  function copiarSecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // ---- Estado: 2FA ACTIVADO ----
  if (enabled) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="bg-green-50 rounded-xl p-2.5">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Verificación en dos pasos activada</h2>
            <p className="text-sm text-gray-500 mt-0.5">Al iniciar sesión te pediremos un código de tu app de autenticación.</p>
          </div>
        </div>

        {!disabling ? (
          <button
            onClick={() => { setDisabling(true); setError('') }}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Desactivar 2FA
          </button>
        ) : (
          <form onSubmit={desactivar} className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm text-gray-600">Introduce un código actual para confirmar la desactivación:</p>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              autoFocus
              className="w-40 px-4 py-2.5 border border-gray-200 rounded-lg text-center tracking-[0.4em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {error && <p className="flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading || code.length !== 6} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                {loading ? 'Desactivando...' : 'Confirmar'}
              </button>
              <button type="button" onClick={() => { setDisabling(false); setCode(''); setError('') }} className="text-sm text-gray-500 px-4 py-2">Cancelar</button>
            </div>
          </form>
        )}
      </div>
    )
  }

  // ---- Estado: 2FA DESACTIVADO ----
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="bg-amber-50 rounded-xl p-2.5">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Verificación en dos pasos desactivada</h2>
          <p className="text-sm text-gray-500 mt-0.5">Añade una capa extra de seguridad con Google Authenticator, Authy o similar.</p>
        </div>
      </div>

      {!qr ? (
        <>
          {error && <p className="flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{error}</p>}
          <button onClick={iniciarAlta} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Generando...' : 'Activar 2FA'}
          </button>
        </>
      ) : (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-gray-400" /> Abre tu app de autenticación y escanea el QR.</li>
          </ol>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR para 2FA" width={176} height={176} className="rounded-lg border border-gray-200" />
            <div className="space-y-2 flex-1">
              <p className="text-xs text-gray-500">¿No puedes escanear? Introduce esta clave manualmente:</p>
              <button onClick={copiarSecret} className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 break-all text-left w-full">
                {copied ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : <Copy className="w-4 h-4 text-gray-400 shrink-0" />}
                {secret}
              </button>
            </div>
          </div>

          <form onSubmit={activar} className="space-y-3 border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700">Introduce el código de 6 dígitos que muestra la app:</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              autoFocus
              className="w-40 px-4 py-2.5 border border-gray-200 rounded-lg text-center tracking-[0.4em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {error && <p className="flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="block bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Activando...' : 'Activar'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
