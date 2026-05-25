'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Cliente { id?: number; nombre: string; email: string; telefono?: string | null }
interface Props { cliente?: Cliente }

export default function ClienteForm({ cliente }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!cliente?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))

    const res = await fetch(isEdit ? `/api/clientes/${cliente.id}` : '/api/clientes', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      router.push('/clientes')
      router.refresh()
    } else {
      const err = await res.json()
      setError(err.error ?? 'Error al guardar cliente')
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div>
        <label className={labelClass}>Nombre *</label>
        <input name="nombre" required defaultValue={cliente?.nombre} placeholder="Nombre de la empresa o persona" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <input name="email" type="email" required defaultValue={cliente?.email} placeholder="email@ejemplo.com" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Teléfono</label>
        <input name="telefono" defaultValue={cliente?.telefono ?? ''} placeholder="+34 600 000 000" className={inputClass} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60 transition-colors">
          {loading ? 'Guardando...' : isEdit ? 'Actualizar cliente' : 'Crear cliente'}
        </button>
      </div>
    </form>
  )
}
