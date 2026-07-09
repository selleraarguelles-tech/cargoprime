import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import { getAccessToken, getRecentUnshippedOrders, getOrderItems, getOrderAddress } from '@/lib/spapi'
import { syncStockForCuenta } from '@/lib/syncStock'
import { syncTrackingForCuenta } from '@/lib/syncTracking'
import { refreshCttTrackingPendientes } from '@/lib/refreshCttTracking'
import { confirmShipmentsForCuenta } from '@/lib/confirmShipmentAmazon'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = await getAmazonConfig()
  if (!cfg.clientId || !cfg.clientSecret) {
    return NextResponse.json({ error: 'SP-API no configurado' }, { status: 503 })
  }

  const cuentas = await prisma.cuentaAmazon.findMany({ where: { activo: true } })

  // Use last sync timestamp from DB so no orders are missed between cron runs.
  // If never synced before, default to 24h ago.
  const lastSyncRaw = await prisma.configuracion.findUnique({ where: { clave: 'cron_last_sync_at' } })
  const since = lastSyncRaw
    ? new Date(lastSyncRaw.valor)
    : new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Save current time before fetching so no orders fall through the gap
  const syncStartedAt = new Date().toISOString()

  let totalCreados = 0
  let totalActualizados = 0
  let totalConfirmados = 0
  const allErrors: string[] = []

  for (const cuenta of cuentas) {
    try {
      const accessToken = await getAccessToken(cuenta.refreshToken, {
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
      })

      const orders = await getRecentUnshippedOrders(accessToken, cuenta.marketplaceId, since, cuenta.isSandbox)

      for (const order of orders) {
        const exists = await prisma.pedido.findUnique({
          where: { amazonOrderId: order.AmazonOrderId },
        })
        if (exists) continue

        try {
          await sleep(300)
          const items = await getOrderItems(accessToken, cuenta.marketplaceId, order.AmazonOrderId, cuenta.isSandbox)
          const firstItem = items[0]
          if (!firstItem) continue

          let address = order.ShippingAddress
          if (!address) {
            address = await getOrderAddress(accessToken, cuenta.marketplaceId, order.AmazonOrderId, cuenta.isSandbox) ?? undefined
          }

          let producto = firstItem.SellerSKU
            ? await prisma.producto.findUnique({ where: { sku: firstItem.SellerSKU } })
            : null

          if (!producto) {
            const sku = firstItem.SellerSKU ?? `ASIN-${firstItem.ASIN}`
            producto = await prisma.producto.upsert({
              where: { sku },
              update: {},
              create: {
                sku,
                nombre: firstItem.Title.slice(0, 100),
                clienteId: cuenta.clienteId,
                stockActual: 0,
              },
            })
          }

          await prisma.pedido.create({
            data: {
              amazonOrderId: order.AmazonOrderId,
              clienteId: cuenta.clienteId,
              productoId: producto.id,
              destinatarioNombre: address?.Name ?? 'Sin nombre',
              destinatarioDireccion: [address?.AddressLine1, address?.AddressLine2]
                .filter(Boolean).join(', ') || 'Sin dirección',
              destinatarioCP: address?.PostalCode ?? '',
              destinatarioCiudad: address?.City ?? '',
              destinatarioPais: address?.CountryCode ?? 'ES',
              estado: 'sin_etiqueta',
              createdAt: new Date(order.PurchaseDate),
            },
          })
          totalCreados++
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          allErrors.push(`${order.AmazonOrderId}: ${msg}`)
        }
      }
      const { actualizados } = await syncTrackingForCuenta(accessToken, cuenta.marketplaceId, cuenta.clienteId, cuenta.isSandbox)
      totalActualizados += actualizados

      await syncStockForCuenta(accessToken, cuenta.sellerId, cuenta.marketplaceId, cuenta.clienteId, cuenta.isSandbox)

      // Subir a Amazon el tracking de CTT de los pedidos ya enviados (protege el Valid Tracking Rate).
      try {
        const { confirmados } = await confirmShipmentsForCuenta(accessToken, {
          clienteId: cuenta.clienteId,
          sellerId: cuenta.sellerId,
          marketplaceId: cuenta.marketplaceId,
          isSandbox: cuenta.isSandbox,
        })
        totalConfirmados += confirmados
      } catch (e: unknown) {
        allErrors.push(`Confirmación Amazon cuenta ${cuenta.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      allErrors.push(`Cuenta ${cuenta.id}: ${msg}`)
    }
  }

  // Refrescar el estado real de los envíos CTT aún en curso (pasa a Entregado/Incidencia solo)
  let ctt = { revisados: 0, actualizados: 0, errores: 0 }
  try {
    ctt = await refreshCttTrackingPendientes()
  } catch (e: unknown) {
    allErrors.push(`CTT tracking: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Los avisos/reclamaciones por email se envían en el cron de medianoche
  // (/api/cron/avisos-retraso), solo en días laborables.

  // Persist the sync start time so next run picks up from here
  await prisma.configuracion.upsert({
    where: { clave: 'cron_last_sync_at' },
    update: { valor: syncStartedAt },
    create: { clave: 'cron_last_sync_at', valor: syncStartedAt },
  })

  console.log(`[cron/sync-orders] since=${since.toISOString()} creados=${totalCreados} actualizados=${totalActualizados} confirmadosAmazon=${totalConfirmados} cttRevisados=${ctt.revisados} cttActualizados=${ctt.actualizados} errores=${allErrors.length}`)
  return NextResponse.json({ ok: true, since: since.toISOString(), totalCreados, totalActualizados, totalConfirmados, cttTracking: ctt, errores: allErrors.slice(0, 10) })
}
