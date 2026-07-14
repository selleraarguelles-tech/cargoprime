import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUnfulfilledOrders } from '@/lib/shopify'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { cuentaId, dias } = await req.json()
  if (!cuentaId) return NextResponse.json({ error: 'cuentaId requerido' }, { status: 400 })

  const cuenta = await prisma.cuentaShopify.findUnique({ where: { id: parseInt(cuentaId) }, include: { cliente: true } })
  if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  try {
    const since = new Date(Date.now() - (dias ?? 30) * 24 * 60 * 60 * 1000)
    const orders = await getUnfulfilledOrders(cuenta.shopDomain, cuenta.accessToken, since)

    let creados = 0
    let omitidos = 0
    const errores: string[] = []

    for (const order of orders) {
      const orderId = String(order.id)
      const exists = await prisma.pedido.findUnique({ where: { amazonOrderId: orderId } })
      if (exists) { omitidos++; continue }

      try {
        const firstItem = order.line_items[0]
        if (!firstItem) { omitidos++; continue }

        let producto = firstItem.sku
          ? await prisma.producto.findUnique({ where: { sku: firstItem.sku } })
          : null

        if (!producto) {
          const sku = firstItem.sku ?? `SHOPIFY-${orderId}`
          producto = await prisma.producto.upsert({
            where: { sku },
            update: {},
            create: {
              sku,
              nombre: firstItem.title.slice(0, 100),
              clienteId: cuenta.clienteId,
              stockActual: 0,
            },
          })
        }

        const address = order.shipping_address

        const cantidad = firstItem.quantity || 1
        const precioUnit = firstItem.price ? parseFloat(firstItem.price) : null

        await prisma.pedido.create({
          data: {
            amazonOrderId: orderId,
            canal: 'shopify',
            clienteId: cuenta.clienteId,
            productoId: producto.id,
            cantidad,
            importe: precioUnit !== null && Number.isFinite(precioUnit) ? precioUnit * cantidad : null,
            moneda: order.currency ?? null,
            destinatarioNombre: address?.name ?? 'Sin nombre',
            destinatarioDireccion: [address?.address1, address?.address2].filter(Boolean).join(', ') || 'Sin dirección',
            destinatarioCP: address?.zip ?? '',
            destinatarioCiudad: address?.city ?? '',
            destinatarioPais: address?.country_code ?? 'ES',
            estado: 'sin_etiqueta',
            createdAt: new Date(order.created_at),
          },
        })
        creados++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        errores.push(`${orderId}: ${msg}`)
      }
    }

    return NextResponse.json({ ok: true, totalShopify: orders.length, creados, omitidos, errores: errores.slice(0, 10) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[shopify sincronizar]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
