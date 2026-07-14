import { prisma } from './prisma'
import { emailConfigurado, sendResumenRetrasos, sendReclamacionCTT, type FilaRetraso } from './mail'
import { notificar } from './notificaciones'

const EMAIL_INTERNO = 'info@cargoprime.es'
const EMAIL_CTT = 'cca.z6@cttexpress.com'
const LIMITE_HORAS = 36
const MAX_RECLAMACIONES_POR_EJECUCION = 15

// Estados cerrados: no cuentan como pendientes de entrega
const CERRADOS = [
  'Entregado', 'Entregado almacén regulador', 'DELIVERED',
  'Devolución', 'Reexpedición', 'Envío anulado', 'RETURNED', 'No encontrado en CTT', 'No encontrado en CEX',
]

function fechaES(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(d)
}

/**
 * Localiza los envíos con más de 36h sin entregar y:
 * 1) Manda un resumen interno a info@cargoprime.es (cada ejecución mientras haya alguno).
 * 2) Manda UNA reclamación individual a CTT por cada envío no reclamado antes (con copia interna).
 */
export async function avisarRetrasosEntrega(): Promise<{ retrasados: number; reclamados: number; emails: boolean }> {
  const limite = new Date(Date.now() - LIMITE_HORAS * 60 * 60 * 1000)
  const hace60dias = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const candidatos = await prisma.pedido.findMany({
    where: {
      trackingNumber: { not: null },
      createdAt: { gte: hace60dias },
      OR: [{ trackingEstado: null }, { trackingEstado: { notIn: CERRADOS } }],
    },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { enviadoAt: 'asc' },
  })

  const retrasados = candidatos.filter(p => (p.enviadoAt ?? p.createdAt) < limite)
  if (retrasados.length === 0) return { retrasados: 0, reclamados: 0, emails: false }

  await notificar(
    'retraso36',
    `${retrasados.length} envío${retrasados.length !== 1 ? 's' : ''} con +36h sin entregar`,
    'Revisa el detalle y las reclamaciones a CTT en Seguimiento',
    '/seguimiento?retraso=1'
  )

  if (!(await emailConfigurado())) {
    console.warn('[avisosRetraso] SMTP no configurado: hay', retrasados.length, 'envíos +36h sin avisar')
    return { retrasados: retrasados.length, reclamados: 0, emails: false }
  }

  // 1) Resumen interno
  const filas: FilaRetraso[] = retrasados.map(p => ({
    pedido: p.amazonOrderId,
    cliente: p.cliente.nombre,
    tracking: p.trackingNumber!,
    estadoActual: p.trackingEstado ?? 'Sin datos',
    horas: Math.floor((Date.now() - (p.enviadoAt ?? p.createdAt).getTime()) / 3600000),
    destino: [p.destinatarioCiudad, p.destinatarioCP].filter(Boolean).join(', '),
  }))
  try {
    await sendResumenRetrasos(EMAIL_INTERNO, filas)
  } catch (e) {
    console.error('[avisosRetraso] fallo resumen interno:', e instanceof Error ? e.message : e)
  }

  // 2) Reclamación individual a CTT (solo una vez por envío, y solo envíos CTT)
  let reclamados = 0
  const pendientesReclamar = retrasados.filter(
    p => !p.cttReclamadoAt && p.transportista && /ctt/i.test(p.transportista)
  ).slice(0, MAX_RECLAMACIONES_POR_EJECUCION)

  for (const p of pendientesReclamar) {
    try {
      await sendReclamacionCTT(EMAIL_CTT, EMAIL_INTERNO, {
        tracking: p.trackingNumber!,
        referencia: p.amazonOrderId,
        expedido: fechaES(p.enviadoAt ?? p.createdAt),
        estadoActual: p.trackingEstado ?? 'Sin datos',
        destino: [p.destinatarioCiudad, p.destinatarioCP].filter(Boolean).join(', '),
      })
      await prisma.pedido.update({ where: { id: p.id }, data: { cttReclamadoAt: new Date() } })
      reclamados++
    } catch (e) {
      console.error('[avisosRetraso] fallo reclamación', p.amazonOrderId, ':', e instanceof Error ? e.message : e)
    }
  }

  return { retrasados: retrasados.length, reclamados, emails: true }
}
