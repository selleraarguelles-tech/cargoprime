'use client'

import { useState } from 'react'
import { Warehouse, ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()

    if (res.ok) {
      setSent(true)
    } else {
      setError(data.error ?? 'No se pudo enviar el correo. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-orange-500 rounded-2xl p-4 mb-4 shadow-lg">
            <Warehouse className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Almacén FBM</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Correo enviado</h2>
              <p className="text-sm text-gray-500 mt-2">
                Si <strong>{email}</strong> está registrado en el sistema, recibirás un correo con tu contraseña temporal en unos minutos.
              </p>
            </div>

            <div className="w-full bg-orange-50 border border-orange-100 rounded-lg p-4 text-left text-sm text-orange-700">
              <p className="font-semibold mb-1">¿No recibes el correo?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Revisa la carpeta de spam o correo no deseado</li>
                <li>Asegúrate de que el email coincide con el registrado</li>
                <li>Contacta con el administrador del sistema</li>
              </ul>
            </div>

            <Link
              href="/login"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center bg-orange-500 rounded-2xl p-4 mb-4 shadow-lg">
          <Warehouse className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Almacén FBM</h1>
        <p className="text-gray-500 text-sm mt-1">Recuperación de contraseña</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-100 rounded-lg p-2">
            <Mail className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">¿Olvidaste tu contraseña?</h2>
            <p className="text-xs text-gray-500">Te enviaremos una contraseña temporal al correo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Usa el email con el que estás registrado en el sistema
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Enviando correo...' : 'Enviar contraseña temporal'}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-gray-100 text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
