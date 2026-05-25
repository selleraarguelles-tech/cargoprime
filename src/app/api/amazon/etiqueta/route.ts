import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import { getAccessToken, getMFNLabel } from '@/lib/spapi'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const shipmentId = searchParams.get('shipmentId')
  const cuentaId = searchParams.get('cuentaId')

  if (!shipmentId || !cuentaId) {
    return NextResponse.json({ error: 'shipmentId y cuentaId requeridos' }, { status: 400 })
  }

  const [cuenta, cfg] = await Promise.all([
    prisma.cuentaAmazon.findUnique({ where: { id: parseInt(cuentaId) } }),
    getAmazonConfig(),
  ])

  if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  if (!cfg.clientId || !cfg.clientSecret) {
    return NextResponse.json({ error: 'SP-API no configurado' }, { status: 503 })
  }

  try {
    const accessToken = await getAccessToken(cuenta.refreshToken, {
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
    })
    const label = await getMFNLabel(accessToken, cuenta.marketplaceId, shipmentId)

    if (!label) {
      return NextResponse.json({ error: 'Etiqueta no disponible para este envío' }, { status: 404 })
    }

    if (label.format === 'PDF' || label.format === 'application/pdf') {
      const buffer = Buffer.from(label.data, 'base64')
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="etiqueta-${shipmentId}.pdf"`,
        },
      })
    }

    return NextResponse.json({ format: label.format, data: label.data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
