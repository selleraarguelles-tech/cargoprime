'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react'

interface CuentaBasica { id: number; activo: boolean }

interface Resultado {
  creados: number
  actualizados: number
  omitidos: number
  cuentas: number
  errores: string[]
}

const PLATAFORMAS = [
  { nombre: 'Amazon', cuentasUrl: '/api/amazon/cuentas', syncUrl: '/api/amazon/sincronizar' },
  { nombre: 'TikTok Shop', cuentasUrl: '/api/tiktok/cuentas', syncUrl: '/api/tiktok/sincronizar' },
  { nombre: 'Shopify', cuentasUrl: '/api/shopify/cuentas', syncUrl: '/api/shopify/sincronizar' },
]

export default function SyncAllButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function sincronizarTodo() {
    setLoading(true)
    setResultado(null)
    const acc: Resultado = { creados: 0, actualizados: 0, omitidos: 0, cuentas: 0, errores: [] }

    for (const plat of PLATAFORMAS) {
      let cuentas: CuentaBasica[] = []
      try {
        const res = await fetch(plat.cuentasUrl)
        if (res.ok) cuentas = await res.json()
      } catch {
        continue
      }

      for (const cuenta of cuentas.filter(c => c.activo)) {
        acc.cuentas++
        setProgreso(`Sincronizando ${plat.nombre}...`)
        try {
          const res = await fetch(plat.syncUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cuentaId: cuenta.id }),
          })
          const data = await res.json()
          if (res.ok) {
            acc.creados += data.creados ?? 0
            acc.actualizados += data.actualizados ?? 0
            acc.omitidos += data.omitidos ?? 0
            if (Array.isArray(data.errores)) acc.errores.push(...data.errores)
          } else {
            acc.errores.push(`${plat.nombre}: ${data.error ?? 'error'}`)
          }
        } catch (e) {
          acc.errores.push(`${plat.nombre}: ${e instanceof Error ? e.message : 'error'}`)
        }
      }
    }

    setProgreso('')
    setResultado(acc)
    setLoading(false)
    if (acc.creados > 0 || acc.actualizados > 0) router.refresh()
  }

  return (
    <>
      <button
        onClick={sincronizarTodo}
        disabled={loading}
        className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? (progreso || 'Sincronizando...') : 'Sincronizar todo'}
      </button>

      {resultado && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 p-4 flex gap-3">
          {resultado.errores.length === 0 ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div className="text-sm flex-1">
            <p className="font-semibold text-gray-900">Sincronización completada</p>
            {resultado.cuentas === 0 ? (
              <p className="text-gray-500 mt-0.5">No hay cuentas conectadas en ninguna plataforma.</p>
            ) : (
              <p className="text-gray-600 mt-0.5">
                {resultado.cuentas} cuenta{resultado.cuentas !== 1 ? 's' : ''} ·{' '}
                <strong>{resultado.creados} nuevos</strong> ·{' '}
                {resultado.actualizados} con tracking · {resultado.omitidos} ya existían
              </p>
            )}
            {resultado.errores.length > 0 && (
              <p className="text-amber-700 mt-1 text-xs">
                {resultado.errores.length} aviso{resultado.errores.length !== 1 ? 's' : ''}: {resultado.errores.slice(0, 3).join(' · ')}
              </p>
            )}
          </div>
          <button onClick={() => setResultado(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
