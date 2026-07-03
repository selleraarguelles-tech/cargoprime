'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ESTADOS_PEDIDO } from '@/lib/utils'

interface Cliente { id: number; nombre: string }

interface Props {
  clientes: Cliente[]
  estadoActivo?: string
  clienteActivo?: string
  buscarActivo?: string
  desdeActivo?: string
  hastaActivo?: string
}

export default function PedidosFilters({ clientes, estadoActivo, clienteActivo, buscarActivo, desdeActivo, hastaActivo }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <input
          type="search"
          placeholder="Buscar por pedido, destinatario o ciudad..."
          defaultValue={buscarActivo ?? ''}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
          onChange={(e) => {
            clearTimeout((window as unknown as Record<string, number>).__buscarTimer)
            ;(window as unknown as Record<string, number>).__buscarTimer = window.setTimeout(
              () => updateFilter('buscar', e.target.value),
              400
            )
          }}
        />

        <select
          defaultValue={estadoActivo ?? ''}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
          onChange={(e) => updateFilter('estado', e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS_PEDIDO).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          defaultValue={clienteActivo ?? ''}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
          onChange={(e) => updateFilter('cliente', e.target.value)}
        >
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            defaultValue={desdeActivo ?? ''}
            max={hastaActivo ?? undefined}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            onChange={(e) => updateFilter('desde', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            defaultValue={hastaActivo ?? ''}
            min={desdeActivo ?? undefined}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            onChange={(e) => updateFilter('hasta', e.target.value)}
          />
        </div>

        {(estadoActivo || clienteActivo || buscarActivo || desdeActivo || hastaActivo) && (
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
