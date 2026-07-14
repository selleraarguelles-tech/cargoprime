import { prisma } from './prisma'

export type CarrierCode = 'ctt' | 'cex'

export const CARRIER_LABELS: Record<CarrierCode, string> = {
  ctt: 'CTT Express',
  cex: 'Correos Express',
}

/** Transportista preferido para un cliente+canal. Sin configuración → CTT. */
export async function getTransportistaPreferido(clienteId: number, canal: string): Promise<CarrierCode> {
  const pref = await prisma.preferenciaTransportista.findUnique({
    where: { clienteId_canal: { clienteId, canal } },
    select: { transportista: true },
  })
  return pref?.transportista === 'cex' ? 'cex' : 'ctt'
}

/** Mapa de preferencias para varios clientes de golpe (clave `${clienteId}:${canal}`). */
export async function getPreferenciasMap(clienteIds: number[]): Promise<Map<string, CarrierCode>> {
  if (clienteIds.length === 0) return new Map()
  const prefs = await prisma.preferenciaTransportista.findMany({
    where: { clienteId: { in: clienteIds } },
  })
  return new Map(prefs.map(p => [`${p.clienteId}:${p.canal}`, p.transportista === 'cex' ? 'cex' as const : 'ctt' as const]))
}
