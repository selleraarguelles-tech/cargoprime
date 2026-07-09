'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Boxes, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [step, setStep] = useState<'cred' | 'code'>('cred')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Crea la sesión con NextAuth (con o sin código 2FA).
  async function entrar(codigo?: string) {
    const result = await signIn('credentials', {
      email,
      password,
      code: codigo ?? '',
      redirect: false,
      callbackUrl,
    })
    if (result?.error) {
      setError(codigo ? 'Código incorrecto' : 'Email o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  // Paso 1: validar credenciales y decidir si hace falta el segundo paso.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/precheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({ ok: false }))

    if (!res.ok || !data.ok) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    if (data.needs2fa) {
      setStep('code')
      setLoading(false)
      return
    }

    await entrar()
  }

  // Paso 2: enviar el código 2FA.
  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    await entrar(code)
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center bg-gradient-to-br from-[#e0b437] to-[#c9a227] rounded-2xl p-4 mb-4 shadow-lg shadow-amber-900/20">
          <Boxes className="w-8 h-8 text-[#0d1526]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Cargo<span className="text-[#c9a227]">Prime</span></h1>
        <p className="text-gray-500 text-sm mt-1">Plataforma de fulfillment y logística</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {step === 'code' ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-50 rounded-lg p-2"><ShieldCheck className="w-5 h-5 text-orange-500" /></div>
              <h2 className="text-lg font-semibold text-gray-900">Verificación en dos pasos</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">Introduce el código de 6 dígitos de tu app de autenticación.</p>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoFocus
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center tracking-[0.5em] font-mono text-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
              />

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('cred'); setCode(''); setError('') }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
            </form>
          </>
        ) : (
        <>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

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
              autoComplete="email"
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-gray-100 text-center">
          <Link href="/recuperar-password" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        </>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">CargoPrime · Logística de calidad</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
