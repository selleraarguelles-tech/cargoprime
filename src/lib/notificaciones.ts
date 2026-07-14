import { prisma } from './prisma'

/**
 * Crea una notificación in-app para el panel interno (campanita).
 * Best-effort: nunca lanza — un fallo aquí no debe romper la operación principal.
 */
export async function notificar(tipo: string, titulo: string, mensaje?: string, href?: string): Promise<void> {
  try {
    await prisma.notificacion.create({
      data: { tipo, titulo, mensaje: mensaje ?? null, href: href ?? null },
    })
  } catch (e) {
    console.error('[notificar]', tipo, e instanceof Error ? e.message : e)
  }
}
