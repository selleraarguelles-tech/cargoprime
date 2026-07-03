'use client'

import { useRouter, usePathname } from 'next/navigation'

interface Props {
  desdeActivo?: string
  hastaActivo?: string
}

export default function EnviosFilters({ desdeActivo, hastaActivo }: Props) {
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

        {(desdeActivo || hastaActivo) && (
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
