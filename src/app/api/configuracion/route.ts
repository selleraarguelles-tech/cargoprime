import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

const AMAZON_KEYS = [
  'amazon_app_id',
  'amazon_lwa_client_id',
  'amazon_lwa_client_secret',
  'amazon_redirect_uri',
]

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const rows = await prisma.configuracion.findMany({
    where: { clave: { in: AMAZON_KEYS } },
  })

  const config: Record<string, string> = {}
  rows.forEach(r => { config[r.clave] = r.valor })

  // Auto-suggest redirect URI based on request host
  if (!config.amazon_redirect_uri) {
    const hdrs = await headers()
    const host = hdrs.get('host') ?? 'localhost:3000'
    const proto = host.includes('localhost') ? 'http' : 'https'
    config.amazon_redirect_uri_suggestion = `${proto}://${host}/api/amazon/callback`
  }

  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()

  // Only allow the amazon keys to be saved via this endpoint
  const entries = Object.entries(body).filter(([k]) => AMAZON_KEYS.includes(k)) as [string, string][]

  await Promise.all(
    entries.map(([clave, valor]) =>
      prisma.configuracion.upsert({
        where: { clave },
        update: { valor },
        create: { clave, valor },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
