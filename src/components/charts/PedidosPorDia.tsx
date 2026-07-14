'use client'

import { useState } from 'react'

interface Dia { clave: string; label: string; count: number }
interface Props { dias: Dia[] }

// Gráfica de barras de pedidos por día (serie única, color de marca).
// SVG con rejilla recesiva, extremos redondeados anclados a la base,
// tooltip por barra y etiquetas directas selectivas (pico y hoy).
export default function PedidosPorDia({ dias }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const W = 660, H = 190
  const M = { top: 18, right: 8, bottom: 22, left: 30 }
  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom

  const max = Math.max(1, ...dias.map(d => d.count))
  // Tope "bonito" para los ticks
  const niceMax = max <= 5 ? 5 : max <= 10 ? 10 : Math.ceil(max / 10) * 10
  const ticks = [0, Math.round(niceMax / 2), niceMax]

  const n = dias.length
  const slot = plotW / n
  const barW = Math.min(28, slot * 0.62)

  const y = (v: number) => M.top + plotH - (v / niceMax) * plotH
  const peak = dias.reduce((best, d, i) => (d.count > dias[best].count ? i : best), 0)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pedidos por día, últimos 14 días">
        {/* Rejilla recesiva + ticks */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#eef0f4" strokeWidth={1} />
            <text x={M.left - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{t}</text>
          </g>
        ))}

        {/* Barras */}
        {dias.map((d, i) => {
          const cx = M.left + slot * i + slot / 2
          const h = (d.count / niceMax) * plotH
          const topY = y(d.count)
          const activo = hover === i
          return (
            <g key={d.clave}>
              {d.count > 0 ? (
                // Extremo superior redondeado (4px), base plana anclada al eje
                <path
                  d={`M ${cx - barW / 2} ${M.top + plotH}
                      L ${cx - barW / 2} ${topY + Math.min(4, h)}
                      Q ${cx - barW / 2} ${topY} ${cx - barW / 2 + Math.min(4, barW / 2)} ${topY}
                      L ${cx + barW / 2 - Math.min(4, barW / 2)} ${topY}
                      Q ${cx + barW / 2} ${topY} ${cx + barW / 2} ${topY + Math.min(4, h)}
                      L ${cx + barW / 2} ${M.top + plotH} Z`}
                  fill={activo ? '#ea580c' : '#f97316'}
                />
              ) : (
                <rect x={cx - barW / 2} y={M.top + plotH - 2} width={barW} height={2} rx={1} fill="#e5e7eb" />
              )}

              {/* Etiquetas directas selectivas: pico y último día */}
              {(i === peak || i === n - 1) && d.count > 0 && hover === null && (
                <text x={cx} y={topY - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#4b5563">{d.count}</text>
              )}
              {activo && (
                <text x={cx} y={topY - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#111827">{d.count}</text>
              )}

              {/* Etiqueta de día */}
              <text x={cx} y={H - 7} textAnchor="middle" fontSize={9} fill={activo ? '#374151' : '#9ca3af'}>{d.label}</text>

              {/* Zona de impacto mayor que la marca */}
              <rect
                x={M.left + slot * i} y={M.top} width={slot} height={plotH + M.bottom}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          )
        })}

        {/* Eje base */}
        <line x1={M.left} x2={W - M.right} y1={M.top + plotH} y2={M.top + plotH} stroke="#d1d5db" strokeWidth={1} />
      </svg>
    </div>
  )
}
