import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAmazonConfig } from '@/lib/config'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const cfg = await getAmazonConfig()
  if (!cfg.isConfigured || !cfg.appId) {
    return NextResponse.redirect(
      new URL('/configuracion?error=amazon_not_configured', req.url)
    )
  }

  const state = crypto.randomUUID()
  const consentUrl =
    `https://sellercentral.amazon.es/apps/authorize/consent` +
    `?application_id=${cfg.appId}&state=${state}&version=beta`

  const response = NextResponse.redirect(consentUrl)
  response.cookies.set('amazon_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    path: '/',
  })
  return response
}
