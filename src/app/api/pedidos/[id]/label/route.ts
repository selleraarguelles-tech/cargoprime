import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import { getAccessToken, getEasyShipLabel } from '@/lib/spapi'

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const pedido = await prisma.pedido.findUnique({ where: { id: parseInt(id) } })
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  const [cuenta, cfg] = await Promise.all([
    prisma.cuentaAmazon.findFirst({ where: { clienteId: pedido.clienteId, activo: true } }),
    getAmazonConfig(),
  ])

  if (!cuenta) return NextResponse.json({ error: 'Cuenta Amazon no encontrada' }, { status: 404 })
  if (!cfg.clientId || !cfg.clientSecret) {
    return NextResponse.json({ error: 'SP-API no configurado' }, { status: 503 })
  }

  try {
    const accessToken = await getAccessToken(cuenta.refreshToken, {
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    })

    const labelUrl = await getEasyShipLabel(accessToken, cuenta.marketplaceId, pedido.amazonOrderId, cuenta.isSandbox)
    if (!labelUrl) {
      return NextResponse.json(
        { error: 'Etiqueta no disponible. El pedido puede no estar programado en Easy Ship todavía.' },
        { status: 404 }
      )
    }

    const pdfRes = await fetch(labelUrl)
    if (!pdfRes.ok) {
      return NextResponse.json({ error: 'Error descargando la etiqueta de Amazon' }, { status: 502 })
    }

    const buffer = await pdfRes.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etiqueta-${pedido.amazonOrderId}.pdf"`,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
