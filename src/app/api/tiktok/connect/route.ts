import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTikTokConfig } from '@/lib/config'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const cfg = await getTikTokConfig()
  if (!cfg.isConfigured || !cfg.appKey) {
    return NextResponse.redirect(
      new URL('/configuracion?error=tiktok_not_configured', req.url)
    )
  }

  const state = crypto.randomUUID()
  const consentUrl =
    `https://services.tiktokshop.com/open/authorize` +
    `?service_id=${cfg.appKey}&state=${state}`

  const response = NextResponse.redirect(consentUrl)
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    path: '/',
  })
  return response
}
