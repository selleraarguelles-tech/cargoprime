/**
 * Regla de "entrega en plazo" de CargoPrime:
 * - La expedición cuenta desde que se genera la etiqueta (enviadoAt).
 * - Si la etiqueta se genera después de las 14:00 (hora Madrid), cuenta como
 *   expedida el siguiente día laborable.
 * - Sábados y domingos no son laborables.
 * - El plazo límite de entrega es el SIGUIENTE día laborable a las 23:59.
 *   Ej.: etiqueta jueves 13:00 → límite viernes 23:59.
 *        etiqueta viernes 15:00 → cuenta como lunes → límite martes 23:59.
 */

const TZ = 'Europe/Madrid'
const DIA_MS = 86_400_000

const fmt = new Intl.DateTimeFormat('sv', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
})

/** Convierte un instante a un "pseudo-timestamp" en hora civil de Madrid (comparable entre sí). */
function pseudoMadrid(d: Date): number {
  const p: Record<string, string> = {}
  for (const part of fmt.formatToParts(d)) if (part.type !== 'literal') p[part.type] = part.value
  const hour = p.hour === '24' ? 0 : parseInt(p.hour)
  return Date.UTC(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day), hour, parseInt(p.minute), parseInt(p.second))
}

function esFinDeSemana(diaMs: number): boolean {
  const wd = new Date(diaMs).getUTCDay()
  return wd === 0 || wd === 6 // domingo o sábado
}

/** Pseudo-timestamp (Madrid) del límite de entrega para una expedición dada. */
export function limiteEntrega(enviadoAt: Date): number {
  const p = new Date(pseudoMadrid(enviadoAt))
  let dia = Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate())

  if (p.getUTCHours() >= 14) dia += DIA_MS      // después de las 14:00 → cuenta al día siguiente
  while (esFinDeSemana(dia)) dia += DIA_MS       // día efectivo de expedición (laborable)

  dia += DIA_MS                                   // siguiente día...
  while (esFinDeSemana(dia)) dia += DIA_MS       // ...laborable

  return dia + DIA_MS - 1                         // ese día a las 23:59:59.999
}

/** ¿Se entregó dentro del plazo? */
export function entregadoEnPlazo(enviadoAt: Date, entregadoAt: Date): boolean {
  return pseudoMadrid(entregadoAt) <= limiteEntrega(enviadoAt)
}
