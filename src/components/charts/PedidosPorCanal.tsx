'use client'

import { useState } from 'react'

interface Fila { canal: string; label: string; count: number }
interface Props { filas: Fila[]; total: number }

// Color fijo por entidad (nunca por posición): el color sigue al canal.
const CANAL_COLOR: Record<string, string> = {
  amazon: '#f97316',
  tiktok: '#6366f1',
  shopify: '#10b981',
  manual: '#0ea5e9',
}

// Barras horizontales de composición por canal, con etiqueta visible
// (nombre + nº + %) para cubrir el aviso de contraste de la paleta.
export default function PedidosPorCanal({ filas, total }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  if (total === 0) return <p className="text-sm text-gray-400">Sin pedidos en el período</p>

  const max = Math.max(...filas.map(f => f.count))

  return (
    <div className="space-y-3">
      {filas.map(f => {
        const color = CANAL_COLOR[f.canal] ?? '#94a3b8'
        const pct = Math.round((f.count / total) * 100)
        const activo = hover === f.canal
        return (
          <div
            key={f.canal}
            onMouseEnter={() => setHover(f.canal)}
            onMouseLeave={() => setHover(null)}
            className="cursor-default"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 font-medium text-gray-700">
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: color }} />
                {f.label}
              </span>
              <span className={activo ? 'text-gray-900 font-semibold' : 'text-gray-500'}>
                {f.count} · {pct}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[filter]"
                style={{
                  width: `${(f.count / max) * 100}%`,
                  backgroundColor: color,
                  filter: activo ? 'brightness(0.9)' : 'none',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
