import { prisma } from './prisma'
import { sendLowStockEmail, emailConfigurado } from './mail'

/**
 * Revisa un producto tras un cambio de stock:
 * - Si ha caído al mínimo o por debajo y aún no se había avisado → notifica al cliente y marca el aviso.
 * - Si ha vuelto por encima del mínimo → resetea el aviso para poder notificar de nuevo en el futuro.
 * Se llama tras actualizar el stock (sincronización o entrada/salida manual).
 */
export async function evaluarAlertaStock(productoId: number): Promise<void> {
  const p = await prisma.producto.findUnique({
    where: { id: productoId },
    include: { cliente: { select: { nombre: true, email: true } } },
  })
  if (!p) return

  const bajoMinimo = p.stockActual <= p.stockMinimo

  if (bajoMinimo && !p.notificadoStockBajo) {
    if (emailConfigurado() && p.cliente.email) {
      try {
        await sendLowStockEmail(p.cliente.email, p.cliente.nombre, p.nombre, p.sku, p.stockActual, p.stockMinimo)
      } catch (e) {
        console.error('[stockAlert] fallo al enviar email:', e instanceof Error ? e.message : e)
      }
    }
    await prisma.producto.update({ where: { id: p.id }, data: { notificadoStockBajo: true } })
  } else if (!bajoMinimo && p.notificadoStockBajo) {
    await prisma.producto.update({ where: { id: p.id }, data: { notificadoStockBajo: false } })
  }
}
