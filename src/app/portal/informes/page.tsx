import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import { entregadoEnPlazo } from '@/lib/sla'
import { BarChart3, CheckCircle2, Clock, Truck } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ENTREGADO = new Set(['Entregado', 'Entregado almacén regulador', 'DELIVERED'])
const INCIDENCIA = new Set(['Reparto fallido', 'Recogida fallida', 'Recogida anulada', 'Envío anulado', 'Devolución', 'Mal transitado', 'UNDELIVERABLE', 'RETURNING', 'RETURNED'])

function isoDia(d: Date) {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(d)
}

export default async function PortalInformes() {
  const clienteId = await getSellerClienteId()

  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hace30.getDate() - 29)

  const pedidos = await prisma.pedido.findMany({
    where: { clienteId, createdAt: { gte: new Date(`${isoDia(hace30)}T00:00:00`) } },
    select: { estado: true, trackingEstado: true, enviadoAt: true, entregadoAt: true },
  })

  let enviados = 0, entregados = 0, incidencias = 0, evaluables = 0, enPlazo = 0
  for (const p of pedidos) {
    if (p.estado === 'enviado') enviados++
    if (p.trackingEstado && ENTREGADO.has(p.trackingEstado)) entregados++
    if (p.trackingEstado && INCIDENCIA.has(p.trackingEstado)) incidencias++
    if (p.enviadoAt && p.entregadoAt) {
      evaluables++
      if (entregadoEnPlazo(p.enviadoAt, p.entregadoAt)) enPlazo++
    }
  }

  const pctPlazo = evaluables > 0 ? Math.round((enPlazo / evaluables) * 100) : null

  const cards = [
    { label: 'Pedidos (30 días)', value: pedidos.length, icon: BarChart3, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Enviados', value: enviados, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Entregados', value: entregados, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Incidencias', value: incidencias, icon: Clock, color: incidencias > 0 ? 'text-red-600' : 'text-slate-400', bg: incidencias > 0 ? 'bg-red-50' : 'bg-slate-100' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Informes</h1>
        <p className="text-gray-500 text-sm mt-1">Actividad de los últimos 30 días.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className={`inline-flex ${c.bg} rounded-lg p-2 mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Entregas en plazo</h2>
        <p className="text-sm text-gray-500 mb-4">Porcentaje de envíos entregados dentro del siguiente día laborable (corte 14:00, sin fines de semana).</p>
        {pctPlazo === null ? (
          <p className="text-gray-400 text-sm">Aún no hay envíos entregados que evaluar en este período.</p>
        ) : (
          <div className="flex items-end gap-4">
            <p className={`text-4xl font-bold ${pctPlazo >= 95 ? 'text-emerald-600' : pctPlazo >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{pctPlazo}%</p>
            <p className="text-sm text-gray-500 mb-1.5">{enPlazo} de {evaluables} envíos entregados a tiempo</p>
          </div>
        )}
      </div>
    </div>
  )
}
