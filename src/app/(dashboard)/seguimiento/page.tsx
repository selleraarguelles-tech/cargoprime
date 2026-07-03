import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { CANALES, ESTADOS_TRACKING } from '@/lib/utils'
import { Radar, CheckCircle2, Truck, AlertTriangle, ExternalLink } from 'lucide-react'
import TrackingRefresh from '../pedidos/TrackingRefresh'
import SeguimientoFilters from './SeguimientoFilters'

export const dynamic = 'force-dynamic'

const ENTREGADO = new Set(['Entregado', 'Entregado almacén regulador', 'DELIVERED'])
const INCIDENCIA = new Set([
  'Reparto fallido', 'Recogida fallida', 'Recogida anulada', 'Envío anulado', 'Devolución',
  'Mal transitado', 'UNDELIVERABLE', 'RETURNING', 'RETURNED',
])

function categoria(trackingEstado: string | null): 'entregado' | 'incidencia' | 'en_curso' {
  if (trackingEstado && ENTREGADO.has(trackingEstado)) return 'entregado'
  if (trackingEstado && INCIDENCIA.has(trackingEstado)) return 'incidencia'
  return 'en_curso'
}

interface Props {
  searchParams: Promise<{ cliente?: string; canal?: string; vista?: string }>
}

export default async function SeguimientoPage({ searchParams }: Props) {
  await auth()
  const { cliente, canal, vista } = await searchParams

  const where: Record<string, unknown> = { trackingNumber: { not: null } }
  if (cliente) where.clienteId = parseInt(cliente)
  if (canal) where.canal = canal

  const [clientes, pedidos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
    prisma.pedido.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { nombre: true } } },
    }),
  ])

  // Resumen por categoría
  let entregados = 0, enCurso = 0, incidencias = 0
  for (const p of pedidos) {
    const c = categoria(p.trackingEstado)
    if (c === 'entregado') entregados++
    else if (c === 'incidencia') incidencias++
    else enCurso++
  }

  const visibles = vista ? pedidos.filter(p => categoria(p.trackingEstado) === vista) : pedidos

  const resumen = [
    { key: 'total', label: 'Con seguimiento', value: pedidos.length, icon: Radar, color: 'bg-slate-500' },
    { key: 'en_curso', label: 'En curso', value: enCurso, icon: Truck, color: 'bg-amber-500' },
    { key: 'entregado', label: 'Entregados', value: entregados, icon: CheckCircle2, color: 'bg-emerald-500' },
    { key: 'incidencia', label: 'Incidencias', value: incidencias, icon: AlertTriangle, color: incidencias > 0 ? 'bg-red-500' : 'bg-gray-400' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Seguimiento</h1>
        <p className="text-gray-500 text-sm mt-0.5">Estado de los envíos ya expedidos · pulsa el icono para actualizar el estado en CTT</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {resumen.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] p-4 flex items-center gap-3">
            <div className={`${color} rounded-lg p-2.5 shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <SeguimientoFilters clientes={clientes} clienteActivo={cliente} canalActivo={canal} estadoActivo={vista} />

      <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-420px)]">
          <table className="w-full text-sm tbl-head tbl-zebra">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nº Pedido', 'Canal', 'Cliente', 'Destinatario', 'Transportista', 'Seguimiento', 'Estado envío', 'Actualizar'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <Radar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No hay envíos con seguimiento en esta vista
                  </td>
                </tr>
              ) : (
                visibles.map(pedido => {
                  const canalInfo = CANALES[pedido.canal]
                  const ti = pedido.trackingEstado ? ESTADOS_TRACKING[pedido.trackingEstado] : null
                  return (
                    <tr key={pedido.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                        <Link href={`/etiquetas/${pedido.id}`} className="hover:text-orange-600 inline-flex items-center gap-1">
                          {pedido.amazonOrderId}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge variant={canalInfo?.variant ?? 'default'}>{canalInfo?.label ?? pedido.canal}</Badge></td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{pedido.cliente.nombre}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{pedido.destinatarioNombre}</p>
                        <p className="text-xs text-gray-500">{pedido.destinatarioCiudad} {pedido.destinatarioCP}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{pedido.transportista ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{pedido.trackingNumber}</td>
                      <td className="px-4 py-3">
                        {ti ? <Badge variant={ti.variant}>{ti.label}</Badge> : <span className="text-gray-400 text-xs">Sin datos</span>}
                      </td>
                      <td className="px-4 py-3">
                        {pedido.transportista === 'CTT Express'
                          ? <TrackingRefresh pedidoId={pedido.id} tieneTracking={!!pedido.trackingNumber} />
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
