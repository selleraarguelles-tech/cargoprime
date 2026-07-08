import { prisma } from '@/lib/prisma'
import { Download, FileSpreadsheet, BarChart3 } from 'lucide-react'
import ReportesFilters from './ReportesFilters'
import { CANALES } from '@/lib/utils'
import { entregadoEnPlazo } from '@/lib/sla'

export const dynamic = 'force-dynamic'

const TRACKING_ENTREGADO = new Set(['Entregado', 'Entregado almacén regulador', 'DELIVERED'])
const TRACKING_INCIDENCIA = new Set([
  'Reparto fallido', 'Recogida fallida', 'Recogida anulada', 'Envío anulado', 'Devolución',
  'Mal transitado', 'UNDELIVERABLE', 'RETURNING', 'RETURNED',
])

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string; cliente?: string; canal?: string }>
}

function isoDia(d: Date) {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(d)
}

export default async function ReportesPage({ searchParams }: Props) {
  const params = await searchParams

  // Período por defecto: últimos 30 días
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hace30.getDate() - 29)
  const desde = params.desde ?? isoDia(hace30)
  const hasta = params.hasta ?? isoDia(hoy)
  const { cliente, canal } = params

  const where: Record<string, unknown> = {
    createdAt: { gte: new Date(`${desde}T00:00:00`), lte: new Date(`${hasta}T23:59:59.999`) },
  }
  if (cliente) where.clienteId = parseInt(cliente)
  if (canal) where.canal = canal

  const whereEnvios: Record<string, unknown> = {
    createdAt: { gte: new Date(`${desde}T00:00:00`), lte: new Date(`${hasta}T23:59:59.999`) },
  }
  if (cliente) whereEnvios.clienteId = parseInt(cliente)

  const [clientes, pedidos, envios] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
    prisma.pedido.findMany({
      where,
      select: { clienteId: true, canal: true, estado: true, trackingEstado: true, enviadoAt: true, entregadoAt: true },
    }),
    prisma.envio.groupBy({ by: ['clienteId'], where: whereEnvios, _count: { id: true } }),
  ])

  // Resumen por cliente
  interface Resumen { total: number; sinEtiqueta: number; preparando: number; enviados: number; entregados: number; incidencias: number; envios: number; evaluables: number; enPlazo: number }
  const resumen = new Map<number, Resumen>()
  const get = (id: number) => {
    if (!resumen.has(id)) resumen.set(id, { total: 0, sinEtiqueta: 0, preparando: 0, enviados: 0, entregados: 0, incidencias: 0, envios: 0, evaluables: 0, enPlazo: 0 })
    return resumen.get(id)!
  }
  for (const p of pedidos) {
    const r = get(p.clienteId)
    r.total++
    if (p.estado === 'sin_etiqueta') r.sinEtiqueta++
    else if (p.estado === 'preparando') r.preparando++
    else if (p.estado === 'enviado') r.enviados++
    if (p.trackingEstado && TRACKING_ENTREGADO.has(p.trackingEstado)) r.entregados++
    if (p.trackingEstado && TRACKING_INCIDENCIA.has(p.trackingEstado)) r.incidencias++
    if (p.enviadoAt && p.entregadoAt) {
      r.evaluables++
      if (entregadoEnPlazo(p.enviadoAt, p.entregadoAt)) r.enPlazo++
    }
  }
  for (const e of envios) get(e.clienteId).envios = e._count.id

  const filas = clientes
    .map(c => ({ cliente: c, r: resumen.get(c.id) }))
    .filter((f): f is { cliente: typeof clientes[number]; r: Resumen } => !!f.r)
    .sort((a, b) => b.r.total - a.r.total)

  const totales = [...resumen.values()].reduce(
    (acc, r) => ({
      total: acc.total + r.total, sinEtiqueta: acc.sinEtiqueta + r.sinEtiqueta,
      preparando: acc.preparando + r.preparando, enviados: acc.enviados + r.enviados,
      entregados: acc.entregados + r.entregados, incidencias: acc.incidencias + r.incidencias,
      envios: acc.envios + r.envios, evaluables: acc.evaluables + r.evaluables, enPlazo: acc.enPlazo + r.enPlazo,
    }),
    { total: 0, sinEtiqueta: 0, preparando: 0, enviados: 0, entregados: 0, incidencias: 0, envios: 0, evaluables: 0, enPlazo: 0 }
  )

  const pct = (enPlazo: number, evaluables: number) => evaluables > 0 ? `${Math.round((enPlazo / evaluables) * 100)}%` : '—'

  const qs = new URLSearchParams({ desde, hasta })
  if (cliente) qs.set('cliente', cliente)
  if (canal) qs.set('canal', canal)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Actividad del {desde.split('-').reverse().join('/')} al {hasta.split('-').reverse().join('/')}
            {canal && <> · canal {CANALES[canal]?.label ?? canal}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/reportes/export?tipo=pedidos&${qs.toString()}`}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar pedidos (CSV)
          </a>
          <a
            href={`/api/reportes/export?tipo=envios&${qs.toString()}`}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar envíos (CSV)
          </a>
        </div>
      </div>

      <ReportesFilters
        clientes={clientes}
        desdeActivo={desde}
        hastaActivo={hasta}
        clienteActivo={cliente}
        canalActivo={canal}
      />

      <div className="bg-white rounded-xl shadow-sm border border-[#e4e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tbl-head tbl-zebra">
            <thead>
              <tr className="border-b border-[#e4e8f0] bg-gray-50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pedidos</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sin etiqueta</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Preparando</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Enviados</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Entregados</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Incidencias</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider" title="Entregas dentro del siguiente día laborable (corte 14:00, sin fines de semana)">% en plazo</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Envíos entrantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Sin actividad en el período seleccionado
                  </td>
                </tr>
              ) : (
                <>
                  {filas.map(({ cliente: c, r }) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.total}</td>
                      <td className={`px-4 py-3 text-right ${r.sinEtiqueta > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{r.sinEtiqueta}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.preparando}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.enviados}</td>
                      <td className="px-4 py-3 text-right text-green-600">{r.entregados}</td>
                      <td className={`px-4 py-3 text-right ${r.incidencias > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{r.incidencias}</td>
                      <td className={`px-4 py-3 text-right font-medium ${r.evaluables === 0 ? 'text-gray-400' : (r.enPlazo / r.evaluables) >= 0.95 ? 'text-green-600' : (r.enPlazo / r.evaluables) >= 0.85 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct(r.enPlazo, r.evaluables)}
                        {r.evaluables > 0 && <span className="text-gray-400 font-normal"> ({r.enPlazo}/{r.evaluables})</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{r.envios}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-4 py-3 text-gray-900">Total</td>
                    <td className="px-4 py-3 text-right text-gray-900">{totales.total}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{totales.sinEtiqueta}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{totales.preparando}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{totales.enviados}</td>
                    <td className="px-4 py-3 text-right text-green-700">{totales.entregados}</td>
                    <td className="px-4 py-3 text-right text-red-700">{totales.incidencias}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{pct(totales.enPlazo, totales.evaluables)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{totales.envios}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Los CSV se exportan con el período y filtros seleccionados, listos para abrir en Excel (separador ;) — útiles para facturación y análisis.
      </p>
    </div>
  )
}
