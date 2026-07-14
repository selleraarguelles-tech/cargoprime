import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { refreshCttTrackingPendientes } from '@/lib/refreshCttTracking'
import { refreshCexTrackingPendientes } from '@/lib/correosExpress'
import { avisarRetrasosEntrega } from '@/lib/avisosRetraso'
import { avisarEntrantesRetrasados } from '@/lib/avisosEntrantes'

export const maxDuration = 300

// Cron de medianoche (L-V): refresca el estado CTT y manda los avisos/reclamaciones
// de envios +36h sin entregar, para que CTT los tenga a primera hora del dia laborable.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process["env"].CRON_SECRET
  const isCron = secret && authHeader === `Bearer ${secret}`
  if (!isCron) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Solo dias laborables en hora de Madrid (sabado/domingo CTT no trabaja)
  const diaMadrid = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(new Date())
  if (diaMadrid === 'Sat' || diaMadrid === 'Sun') {
    return NextResponse.json({ ok: true, omitido: 'fin de semana', dia: diaMadrid })
  }

  // Refresca el estado real de los envios en curso antes de reclamar
  let ctt = { revisados: 0, actualizados: 0, errores: 0 }
  try {
    ctt = await refreshCttTrackingPendientes()
  } catch (e) {
    console.error('[avisos-retraso] refresh CTT fallo:', e instanceof Error ? e.message : e)
  }
  try {
    await refreshCexTrackingPendientes()
  } catch (e) {
    console.error('[avisos-retraso] refresh CEX fallo:', e instanceof Error ? e.message : e)
  }

  const avisos = await avisarRetrasosEntrega()

  // Envíos entrantes con +48h de retraso sobre la fecha esperada → aviso al cliente
  let entrantes = { retrasados: 0, avisados: 0 }
  try {
    entrantes = await avisarEntrantesRetrasados()
  } catch (e) {
    console.error('[avisos-retraso] entrantes fallo:', e instanceof Error ? e.message : e)
  }

  console.log(`[cron/avisos-retraso] dia=${diaMadrid} cttActualizados=${ctt.actualizados} retrasados=${avisos.retrasados} reclamados=${avisos.reclamados} entrantes48h=${entrantes.avisados} emails=${avisos.emails}`)
  return NextResponse.json({ ok: true, dia: diaMadrid, cttTracking: ctt, avisosRetraso: avisos, entrantesRetrasados: entrantes })
}
