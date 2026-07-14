import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import { getAccessToken, getOrders, getOrderItems, getOrderAddress } from '@/lib/spapi'
import { syncStockForCuenta } from '@/lib/syncStock'
import { syncTrackingForCuenta } from '@/lib/syncTracking'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { cuentaId, dias } = await req.json()
  if (!cuentaId) return NextResponse.json({ error: 'cuentaId requerido' }, { status: 400 })

  const [cuenta, cfg] = await Promise.all([
    prisma.cuentaAmazon.findUnique({ where: { id: parseInt(cuentaId) }, include: { cliente: true } }),
    getAmazonConfig(),
  ])

  if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  if (!cfg.clientId || !cfg.clientSecret) {
    return NextResponse.json({ error: 'SP-API no configurado. Ve a Configuración.' }, { status: 503 })
  }

  try {
    const accessToken = await getAccessToken(cuenta.refreshToken, {
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    })

    const sandbox = cuenta.isSandbox
    const orders = await getOrders(accessToken, cuenta.marketplaceId, dias ?? 30, sandbox)

    let creados = 0
    let omitidos = 0
    const errores: string[] = []

    for (const order of orders) {
      const exists = await prisma.pedido.findUnique({
        where: { amazonOrderId: order.AmazonOrderId },
      })
      if (exists) { omitidos++; continue }

      try {
        await sleep(300) // SP-API orderItems rate limit: 0.5 req/s burst 30
        const items = await getOrderItems(accessToken, cuenta.marketplaceId, order.AmazonOrderId, sandbox)
        const firstItem = items[0]
        if (!firstItem) { omitidos++; continue }

        let address = order.ShippingAddress
        if (!address) {
          address = await getOrderAddress(accessToken, cuenta.marketplaceId, order.AmazonOrderId, sandbox) ?? undefined
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

        const importe = firstItem.ItemPrice?.Amount ? parseFloat(firstItem.ItemPrice.Amount) : null

        await prisma.pedido.create({
          data: {
            amazonOrderId: order.AmazonOrderId,
            clienteId: cuenta.clienteId,
            productoId: producto.id,
            cantidad: firstItem.QuantityOrdered || 1,
            importe: importe !== null && Number.isFinite(importe) ? importe : null,
            moneda: firstItem.ItemPrice?.CurrencyCode ?? null,
            destinatarioNombre: address?.Name ?? 'Sin nombre',
            destinatarioDireccion: [address?.AddressLine1, address?.AddressLine2]
              .filter(Boolean).join(', ') || 'Sin dirección',
            destinatarioCP: address?.PostalCode ?? '',
            destinatarioCiudad: address?.City ?? '',
            destinatarioPais: address?.CountryCode ?? 'ES',
            estado: order.OrderStatus === 'Shipped' ? 'enviado' : 'sin_etiqueta',
            createdAt: new Date(order.PurchaseDate),
          },
        })
        creados++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        errores.push(`${order.AmazonOrderId}: ${msg}`)
      }
    }

    const { actualizados } = await syncTrackingForCuenta(accessToken, cuenta.marketplaceId, cuenta.clienteId, cuenta.isSandbox)

    await syncStockForCuenta(accessToken, cuenta.sellerId, cuenta.marketplaceId, cuenta.clienteId, cuenta.isSandbox)

    return NextResponse.json({ ok: true, totalAmazon: orders.length, creados, actualizados, omitidos, errores: errores.slice(0, 10) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sincronizar]', err)
    if (msg.includes('invalid_grant') || msg.includes('invalid_token')) {
      return NextResponse.json({ error: 'Token caducado. Reconecta la cuenta desde "Conectar con Amazon".' }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
