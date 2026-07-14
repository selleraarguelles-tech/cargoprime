'use client'

import { useState } from 'react'
import { CheckCircle2, Truck, AlertTriangle } from 'lucide-react'

interface Props {
  entregados: number
  enCurso: number
  incidencias: number
  total: number
}

// Barra apilada de estado (paleta de estado reservada: bien/aviso/grave),
// con separadores de 2px entre segmentos e icono + etiqueta (nunca solo color).
export default function EstadoEnvios({ entregados, enCurso, incidencias, total }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  if (total === 0) return <p className="text-sm text-gray-400">Aún sin datos de seguimiento</p>

  const segmentos = [
    { key: 'entregados', valor: entregados, color: '#10b981', label: 'Entregados', Icon: CheckCircle2 },
    { key: 'enCurso', valor: enCurso, color: '#f59e0b', label: 'En curso', Icon: Truck },
    { key: 'incidencias', valor: incidencias, color: '#ef4444', label: 'Incidencias', Icon: AlertTriangle },
  ].filter(s => s.valor > 0)

  return (
    <>
      {/* Apilada con hueco de 2px entre segmentos */}
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px] mb-3">
        {segmentos.map(s => (
          <div
            key={s.key}
            className="h-full first:rounded-l-full last:rounded-r-full transition-[filter]"
            style={{
              width: `${(s.valor / total) * 100}%`,
              backgroundColor: s.color,
              filter: hover && hover !== s.key ? 'opacity(0.35)' : 'none',
            }}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            title={`${s.label}: ${s.valor} (${Math.round((s.valor / total) * 100)}%)`}
          />
        ))}
      </div>

      <div className="space-y-1.5 text-xs">
        {segmentos.map(({ key, valor, color, label, Icon }) => (
          <p
            key={key}
            className="flex items-center gap-2 text-gray-600 cursor-default"
            onMouseEnter={() => setHover(key)}
            onMouseLeave={() => setHover(null)}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
            {label}
            <span className={`ml-auto font-semibold ${hover === key ? 'text-gray-900' : 'text-gray-800'}`}>
              {valor}
              <span className="ml-1 font-normal text-gray-400">({Math.round((valor / total) * 100)}%)</span>
            </span>
          </p>
        ))}
      </div>
    </>
  )
}
