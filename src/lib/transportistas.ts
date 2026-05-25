export const TRANSPORTISTAS: Record<string, { label: string }> = {
  correos: { label: 'Correos' },
  gls:     { label: 'GLS' },
  ups:     { label: 'UPS' },
  dhl:     { label: 'DHL' },
  seur:    { label: 'SEUR' },
  mrw:     { label: 'MRW' },
  fedex:   { label: 'FedEx' },
  otro:    { label: 'Otro' },
}

export interface TrackingEvento {
  fecha: string
  descripcion: string
  ubicacion?: string
}

export interface TrackingResult {
  estado: string
  ultimoEvento: string
  ubicacion?: string
  fechaUltimoEvento?: string
  entregado: boolean
  eventos: TrackingEvento[]
  fuente: 'api' | 'url'
  trackingUrl: string
}

function getTrackingUrl(transportista: string, trackingNumber: string): string {
  const map: Record<string, string> = {
    correos: `https://www.correos.es/ss/Satellite/site/aplicacion-1349167673028-seguimiento_envios/detalle_app-sidiom-es_ES?numberToSearch=${trackingNumber}`,
    gls:     `https://gls-group.eu/ES/es/seguimiento-envios?match=${trackingNumber}`,
    ups:     `https://www.ups.com/track?tracknum=${trackingNumber}&loc=es_ES`,
    dhl:     `https://www.dhl.com/es-es/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
    seur:    `https://www.seur.com/livetracking/?segmentationId=${trackingNumber}`,
    mrw:     `https://www.mrw.es/seguimiento_envios/MRW_Seguimiento_Envios.asp?Numero=${trackingNumber}`,
    fedex:   `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
  }
  return map[transportista] ?? `https://www.google.com/search?q=tracking+${encodeURIComponent(trackingNumber)}`
}

async function trackCorreos(trackingNumber: string, trackingUrl: string): Promise<TrackingResult> {
  try {
    const res = await fetch(
      `https://api1.correos.es/digital-services/searchengines/api/v1/s?texto=${trackingNumber}&lang=es`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const eventos: Record<string, unknown>[] = data?.eventos ?? []
    const ultimo = eventos[0]
    return {
      estado: String(ultimo?.fase ?? 'En tránsito'),
      ultimoEvento: String(ultimo?.descripcion ?? 'Sin información'),
      ubicacion: (ultimo?.unidadOrigen as Record<string, unknown>)?.nombre as string,
      fechaUltimoEvento: String(ultimo?.fecha ?? ''),
      entregado: String(ultimo?.fase ?? '').toLowerCase().includes('entregad'),
      eventos: eventos.slice(0, 10).map(e => ({
        fecha: String(e.fecha ?? ''),
        descripcion: String(e.descripcion ?? ''),
        ubicacion: (e.unidadOrigen as Record<string, unknown>)?.nombre as string,
      })),
      fuente: 'api',
      trackingUrl,
    }
  } catch {
    return fallback(trackingUrl)
  }
}

async function trackGLS(trackingNumber: string, trackingUrl: string): Promise<TrackingResult> {
  try {
    const res = await fetch(
      `https://gls-group.eu/app/service/open/rest/ES/es/rstt001?match=${trackingNumber}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const tupla = (data?.tuplaResponseList as Record<string, unknown>[])?.[0]
    const events: Record<string, unknown>[] = (tupla?.history as Record<string, unknown>[]) ?? []
    const ultimo = events[0]
    return {
      estado: String((tupla?.progressBar as Record<string, unknown>)?.status ?? 'En tránsito'),
      ultimoEvento: String(ultimo?.evtDscr ?? 'Sin información'),
      ubicacion: (ultimo?.address as Record<string, unknown>)?.city as string,
      fechaUltimoEvento: ultimo?.date ? `${ultimo.date} ${ultimo.time ?? ''}`.trim() : undefined,
      entregado: String((tupla?.progressBar as Record<string, unknown>)?.status ?? '').toLowerCase().includes('deliver'),
      eventos: events.slice(0, 10).map(e => ({
        fecha: `${e.date ?? ''} ${e.time ?? ''}`.trim(),
        descripcion: String(e.evtDscr ?? ''),
        ubicacion: (e.address as Record<string, unknown>)?.city as string,
      })),
      fuente: 'api',
      trackingUrl,
    }
  } catch {
    return fallback(trackingUrl)
  }
}

function fallback(trackingUrl: string): TrackingResult {
  return {
    estado: 'Ver en web del transportista',
    ultimoEvento: 'Haz clic en "Ver tracking" para consultar el estado en la web del transportista',
    entregado: false,
    eventos: [],
    fuente: 'url',
    trackingUrl,
  }
}

export async function getTracking(transportista: string, trackingNumber: string): Promise<TrackingResult> {
  const trackingUrl = getTrackingUrl(transportista, trackingNumber)
  switch (transportista) {
    case 'correos': return trackCorreos(trackingNumber, trackingUrl)
    case 'gls':     return trackGLS(trackingNumber, trackingUrl)
    default:        return fallback(trackingUrl)
  }
}
