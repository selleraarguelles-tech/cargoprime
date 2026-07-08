'use client'

import { useRouter, usePathname } from 'next/navigation'
import Badge from '@/components/Badge'
import { CANALES } from '@/lib/utils'

interface Cliente { id: number; nombre: string }

export interface EstadoChip {
  label: string
  count: number
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'indigo' | 'purple'
}

interface Props {
  clientes: Cliente[]
  estados: EstadoChip[]
  total: number
  clienteActivo?: string
  canalActivo?: string
  estadoActivo?: string
}

export default function SeguimientoFilters({ clientes, estados, total, clienteActivo, canalActivo, estadoActivo }: Props) {
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
      {/* Recorrido del envío: una etapa = un filtro */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Recorrido del envío</p>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => update('estado', '')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              !estadoActivo ? 'bg-[#0d1526] border-[#0d1526] text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            Todos
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${!estadoActivo ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{total}</span>
          </button>
          {estados.map((e, i) => {
            const activo = estadoActivo === e.label
            return (
              <span key={e.label} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-300 text-xs select-none">→</span>}
                <button
                  onClick={() => update('estado', activo ? '' : e.label)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                    activo ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-300' : 'border-gray-200 bg-white hover:border-orange-300'
                  }`}
                  title={`Filtrar por "${e.label}"`}
                >
                  <Badge variant={e.variant}>{e.label}</Badge>
                  <span className={`text-xs font-semibold ${activo ? 'text-orange-600' : 'text-gray-500'}`}>{e.count}</span>
                </button>
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-gray-50">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 mt-2">Cliente</label>
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
          <label className="block text-xs font-medium text-gray-500 mb-1 mt-2">Canal</label>
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
