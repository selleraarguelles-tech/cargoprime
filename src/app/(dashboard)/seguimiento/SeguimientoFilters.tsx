'use client'

import { useRouter, usePathname } from 'next/navigation'
import { CANALES } from '@/lib/utils'

interface Cliente { id: number; nombre: string }

interface Props {
  clientes: Cliente[]
  clienteActivo?: string
  canalActivo?: string
  estadoActivo?: string
}

const ESTADOS_VISTA = [
  { key: '', label: 'Todos' },
  { key: 'en_curso', label: 'En curso' },
  { key: 'entregado', label: 'Entregados' },
  { key: 'incidencia', label: 'Incidencias' },
]

export default function SeguimientoFilters({ clientes, clienteActivo, canalActivo, estadoActivo }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function update(key: string, value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] p-4 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {ESTADOS_VISTA.map(e => {
          const activo = (estadoActivo ?? '') === e.key
          return (
            <button
              key={e.key}
              onClick={() => update('vista', e.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activo ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {e.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cliente</label>
          <select
            defaultValue={clienteActivo ?? ''}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
            onChange={(e) => update('cliente', e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Canal</label>
          <select
            defaultValue={canalActivo ?? ''}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
            onChange={(e) => update('canal', e.target.value)}
          >
            <option value="">Todos los canales</option>
            {Object.entries(CANALES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>

        {(clienteActivo || canalActivo || estadoActivo) && (
          <button
            onClick={() => router.push(pathname)}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
