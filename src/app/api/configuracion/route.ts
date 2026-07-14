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

const CTT_KEYS = [
  'ctt_client_id', 'ctt_client_secret', 'ctt_username', 'ctt_password',
  'ctt_client_center_code', 'ctt_sandbox',
  'ctt_sender_name', 'ctt_sender_address', 'ctt_sender_postal_code',
  'ctt_sender_town', 'ctt_sender_country_code', 'ctt_sender_email', 'ctt_sender_phone',
]

const TIKTOK_KEYS = ['tiktok_app_key', 'tiktok_app_secret', 'tiktok_redirect_uri']

const EMAIL_KEYS = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from']

const CEX_KEYS = ['cex_usuario', 'cex_password', 'cex_solicitante', 'cex_codigo_cliente', 'cex_producto', 'cex_sandbox']

const ALL_KEYS = [...AMAZON_KEYS, ...CTT_KEYS, ...TIKTOK_KEYS, ...EMAIL_KEYS, ...CEX_KEYS]

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const rows = await prisma.configuracion.findMany({
    where: { clave: { in: ALL_KEYS } },
  })

  const config: Record<string, string> = {}
  rows.forEach(r => { config[r.clave] = r.valor })

  // Auto-suggest redirect URIs based on request host
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'

  if (!config.amazon_redirect_uri) {
    config.amazon_redirect_uri_suggestion = `${proto}://${host}/api/amazon/callback`
  }
  if (!config.tiktok_redirect_uri) {
    config.tiktok_redirect_uri_suggestion = `${proto}://${host}/api/tiktok/callback`
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
  const entries = Object.entries(body).filter(([k]) => ALL_KEYS.includes(k)) as [string, string][]

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
