import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTikTokConfig } from '@/lib/config'
import { getAccessToken, getUnshippedOrders } from '@/lib/tiktok'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { cuentaId, dias } = await req.json()
  if (!cuentaId) return NextResponse.json({ error: 'cuentaId requerido' }, { status: 400 })

  const [cuenta, cfg] = await Promise.all([
    prisma.cuentaTikTok.findUnique({ where: { id: parseInt(cuentaId) }, include: { cliente: true } }),
    getTikTokConfig(),
  ])

  if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  if (!cfg.isConfigured || !cfg.appKey || !cfg.appSecret) {
    return NextResponse.json({ error: 'TikTok Shop no configurado. Ve a Configuración.' }, { status: 503 })
  }

  try {
    const accessToken = await getAccessToken(cuenta.refreshToken, { appKey: cfg.appKey, appSecret: cfg.appSecret })
    const since = new Date(Date.now() - (dias ?? 30) * 24 * 60 * 60 * 1000)
    const orders = await getUnshippedOrders(accessToken, cuenta.shopCipher ?? '', { appKey: cfg.appKey, appSecret: cfg.appSecret }, since)

    let creados = 0
    let omitidos = 0
    const errores: string[] = []

    for (const order of orders) {
      const exists = await prisma.pedido.findUnique({ where: { amazonOrderId: order.id } })
      if (exists) { omitidos++; continue }

      try {
        const firstItem = order.line_items[0]
        if (!firstItem) { omitidos++; continue }

        let producto = firstItem.seller_sku
          ? await prisma.producto.findUnique({ where: { sku: firstItem.seller_sku } })
          : null

        if (!producto) {
          const sku = firstItem.seller_sku ?? `TIKTOK-${firstItem.sku_id}`
          producto = await prisma.producto.upsert({
            where: { sku },
            update: {},
            create: {
              sku,
              nombre: firstItem.product_name.slice(0, 100),
              clienteId: cuenta.clienteId,
              stockActual: 0,
            },
          })
        }

        const address = order.recipient_address

        await prisma.pedido.create({
          data: {
            amazonOrderId: order.id,
            canal: 'tiktok',
            clienteId: cuenta.clienteId,
            productoId: producto.id,
            destinatarioNombre: address?.name ?? 'Sin nombre',
            destinatarioDireccion: address?.full_address ?? 'Sin dirección',
            destinatarioCP: address?.postal_code ?? '',
            destinatarioCiudad: address?.district_info?.[0]?.address_level_name ?? '',
            destinatarioPais: address?.region_code ?? 'ES',
            estado: 'sin_etiqueta',
            createdAt: new Date(order.create_time * 1000),
          },
        })
        creados++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        errores.push(`${order.id}: ${msg}`)
      }
    }

    return NextResponse.json({ ok: true, totalTikTok: orders.length, creados, omitidos, errores: errores.slice(0, 10) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[tiktok sincronizar]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
