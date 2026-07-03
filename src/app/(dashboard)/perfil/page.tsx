'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, UserCircle, CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function PerfilPage() {
  const { data: session } = useSession()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    if (form.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    const res = await fetch('/api/cambiar-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    })

    const data = await res.json()
    if (res.ok) {
      setSuccess(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      setError(data.error ?? 'Error al cambiar la contraseña')
    }
    setLoading(false)
  }

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 pr-10"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

  const isAdmin = session?.user?.role === 'admin'

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Información de tu cuenta y seguridad</p>
      </div>

      {/* Info cuenta */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-orange-100 rounded-full p-4">
            <UserCircle className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{session?.user?.name}</h2>
            <p className="text-gray-500 text-sm">@{session?.user?.username}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{session?.user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500">Rol</span>
            <span className={`text-sm font-semibold ${isAdmin ? 'text-orange-600' : 'text-gray-600'}`}>
              {isAdmin ? '🛡 Administrador' : '👁 Solo lectura'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Usuario</span>
            <span className="text-sm font-mono text-gray-700">@{session?.user?.username}</span>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-100 rounded-lg p-2">
            <KeyRound className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Cambiar contraseña</h2>
            <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Contraseña actualizada correctamente
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña actual */}
          <div>
            <label className={labelClass}>Contraseña actual *</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                required
                placeholder="Tu contraseña actual"
                className={inputClass}
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className={labelClass}>Nueva contraseña *</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className={labelClass}>Confirmar nueva contraseña *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
                placeholder="Repite la nueva contraseña"
                className={inputClass}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Indicador de coincidencia */}
          {form.newPassword && form.confirmPassword && (
            <p className={`text-xs ${form.newPassword === form.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
              {form.newPassword === form.confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
            </p>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
