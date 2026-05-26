import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import { getAccessToken, getRecentUnshippedOrders, getOrderItems, getOrderAddress } from '@/lib/spapi'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = await getAmazonConfig()
  if (!cfg.clientId || !cfg.clientSecret) {
    return NextResponse.json({ error: 'SP-API no configurado' }, { status: 503 })
  }

  const cuentas = await prisma.cuentaAmazon.findMany({ where: { activo: true } })

  // Look back 15 min to cover gaps between cron runs (cron every 5 min + buffer)
  const since = new Date(Date.now() - 15 * 60 * 1000)

  let totalCreados = 0
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
                stockMinimo: 0,
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      allErrors.push(`Cuenta ${cuenta.id}: ${msg}`)
    }
  }

  console.log(`[cron/sync-orders] creados=${totalCreados} errores=${allErrors.length}`)
  return NextResponse.json({ ok: true, totalCreados, errores: allErrors.slice(0, 10) })
}
