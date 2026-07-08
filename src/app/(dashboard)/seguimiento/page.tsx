import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { CANALES, ESTADOS_TRACKING } from '@/lib/utils'
import { Radar, CheckCircle2, Truck, AlertTriangle, ExternalLink, Clock } from 'lucide-react'
import TrackingRefresh from '../pedidos/TrackingRefresh'
import SeguimientoFilters, { type EstadoChip } from './SeguimientoFilters'

export const dynamic = 'force-dynamic'

const ENTREGADO = new Set(['Entregado', 'Entregado almacén regulador', 'DELIVERED'])
const INCIDENCIA = new Set([
  'Reparto fallido', 'Recogida fallida', 'Recogida anulada', 'Envío anulado', 'Devolución',
  'Mal transitado', 'UNDELIVERABLE', 'RETURNING', 'RETURNED',
])
// Estados que NO cuentan como "pendiente de entrega" para el aviso de +36h (ya cerrados)
const CERRADOS = new Set([...ENTREGADO, 'Devolución', 'Reexpedición', 'Envío anulado', 'RETURNED', 'No encontrado en CTT'])

const LIMITE_HORAS = 36

// Orden natural del recorrido de un paquete (las etiquetas visibles).
const ORDEN_RECORRIDO = [
  'Manifestado',
  'Recogido',
  'Enviado',
  'En tránsito',
  'Delegación de origen',
  'Delegación de tránsito',
  'Delegación destino',
  'En reparto',
  'Entrega parcial',
  'Entregado',
  'Reparto fallido',
  'Recogida fallida',
  'Incidencia en tránsito',
  'No entregable',
  'En devolución',
  'Devolución',
  'Devuelto',
  'Recogida anulada',
  'Envío anulado',
  'No encontrado en CTT',
  'Sin datos',
]

function etiquetaDe(trackingEstado: string | null): string {
  if (!trackingEstado) return 'Sin datos'
  return ESTADOS_TRACKING[trackingEstado]?.label ?? trackingEstado
}

function varianteDe(trackingEstado: string | null): EstadoChip['variant'] {
  if (!trackingEstado) return 'default'
  return ESTADOS_TRACKING[trackingEstado]?.variant ?? 'default'
}

interface Props {
  searchParams: Promise<{ cliente?: string; canal?: string; estado?: string; retraso?: string }>
}

export default async function SeguimientoPage({ searchParams }: Props) {
  await auth()
  const { cliente, canal, estado, retraso } = await searchParams

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

  // Página force-dynamic: se renderiza por petición, la hora actual es intencionada
  // eslint-disable-next-line react-hooks/purity
  const ahoraMs = Date.now()
  const limiteMs = ahoraMs - LIMITE_HORAS * 60 * 60 * 1000
  const esRetrasado = (p: (typeof pedidos)[number]) =>
    !CERRADOS.has(p.trackingEstado ?? '') && (p.enviadoAt ?? p.createdAt).getTime() < limiteMs

  // Resumen por categoría gruesa (tarjetas)
  let entregados = 0, enCurso = 0, incidencias = 0, retrasados = 0
  for (const p of pedidos) {
    if (p.trackingEstado && ENTREGADO.has(p.trackingEstado)) entregados++
    else if (p.trackingEstado && INCIDENCIA.has(p.trackingEstado)) incidencias++
    else enCurso++
    if (esRetrasado(p)) retrasados++
  }

  // Conteo por etapa del recorrido (etiqueta visible)
  const porEtapa = new Map<string, { count: number; variant: EstadoChip['variant'] }>()
  for (const p of pedidos) {
    const label = etiquetaDe(p.trackingEstado)
    const prev = porEtapa.get(label)
    if (prev) prev.count++
    else porEtapa.set(label, { count: 1, variant: varianteDe(p.trackingEstado) })
  }
  const estados: EstadoChip[] = [...porEtapa.entries()]
    .map(([label, v]) => ({ label, count: v.count, variant: v.variant }))
    .sort((a, b) => {
      const ia = ORDEN_RECORRIDO.indexOf(a.label)
      const ib = ORDEN_RECORRIDO.indexOf(b.label)
      return (ia === -1 ? 900 : ia) - (ib === -1 ? 900 : ib)
    })

  let visibles = estado ? pedidos.filter(p => etiquetaDe(p.trackingEstado) === estado) : pedidos
  if (retraso) visibles = visibles.filter(esRetrasado)

  const resumen = [
    { label: 'Con seguimiento', value: pedidos.length, icon: Radar, color: 'bg-slate-500' },
    { label: 'En curso', value: enCurso, icon: Truck, color: 'bg-amber-500' },
    { label: 'Entregados', value: entregados, icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Incidencias', value: incidencias, icon: AlertTriangle, color: incidencias > 0 ? 'bg-red-500' : 'bg-gray-400' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Seguimiento</h1>
        <p className="text-gray-500 text-sm mt-0.5">Estado de los envíos ya expedidos · filtra por cada etapa del recorrido del paquete</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

        {/* Casilla roja: pendientes de revisar por superar las 36h sin entrega */}
        <Link href={retraso ? '/seguimiento' : '/seguimiento?retraso=1'}>
          <div className={`rounded-xl shadow-sm border p-4 flex items-center gap-3 h-full transition-shadow hover:shadow-md ${
            retrasados > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-[#e4e8f0]'
          } ${retraso ? 'ring-2 ring-red-400' : ''}`}>
            <div className={`${retrasados > 0 ? 'bg-red-500' : 'bg-gray-400'} rounded-lg p-2.5 shrink-0 relative`}>
              <Clock className="w-5 h-5 text-white" />
              {retrasados > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
              )}
            </div>
            <div>
              <p className={`text-xl font-bold ${retrasados > 0 ? 'text-red-700' : 'text-gray-900'}`}>{retrasados}</p>
              <p className={`text-xs ${retrasados > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>+{LIMITE_HORAS}h sin entregar</p>
            </div>
          </div>
        </Link>
      </div>

      <SeguimientoFilters
        clientes={clientes}
        estados={estados}
        total={pedidos.length}
        clienteActivo={cliente}
        canalActivo={canal}
        estadoActivo={estado}
      />

      <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] overflow-hidden">
        {retraso && (
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Mostrando solo los envíos con más de {LIMITE_HORAS}h desde su expedición sin confirmación de entrega — revisa qué ha pasado con cada uno.
            <Link href="/seguimiento" className="ml-auto underline font-medium shrink-0">Quitar filtro</Link>
          </div>
        )}
        <div className="overflow-x-auto max-h-[calc(100vh-460px)]">
          <table className="w-full text-sm tbl-head tbl-zebra">
            <thead>
              <tr className="border-b border-[#e4e8f0]">
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
                    {retraso ? 'Ningún envío supera las 36h sin entregar ✓' : 'No hay envíos en esta etapa'}
                  </td>
                </tr>
              ) : (
                visibles.map(pedido => {
                  const canalInfo = CANALES[pedido.canal]
                  const ti = pedido.trackingEstado ? ESTADOS_TRACKING[pedido.trackingEstado] : null
                  const tarde = esRetrasado(pedido)
                  const horas = Math.floor((ahoraMs - (pedido.enviadoAt ?? pedido.createdAt).getTime()) / 3600000)
                  return (
                    <tr key={pedido.id} className={`border-b border-gray-50 ${tarde ? '!bg-red-50' : ''}`}>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {pedido.trackingEstado
                            ? <Badge variant={ti?.variant ?? 'default'}>{ti?.label ?? pedido.trackingEstado}</Badge>
                            : <span className="text-gray-400 text-xs">Sin datos</span>}
                          {tarde && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-600 text-white" title={`${horas}h desde la expedición sin entrega confirmada`}>
                              <Clock className="w-3 h-3" /> +{horas}h
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {pedido.transportista && /ctt/i.test(pedido.transportista)
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
