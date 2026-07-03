import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTikTokConfig } from '@/lib/config'
import { exchangeAuthCode } from '@/lib/tiktok'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const savedState = req.cookies.get('tiktok_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/cuentas-tiktok?error=invalid_state', req.url))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/cuentas-tiktok?error=missing_code', req.url))
  }

  const cfg = await getTikTokConfig()
  if (!cfg.isConfigured || !cfg.appKey || !cfg.appSecret) {
    return NextResponse.redirect(new URL('/configuracion?error=tiktok_not_configured', req.url))
  }

  try {
    const { accessToken, refreshToken, shopId, shopCipher, sellerName } = await exchangeAuthCode(code, {
      appKey: cfg.appKey,
      appSecret: cfg.appSecret,
    })

    const response = NextResponse.redirect(
      new URL(
        `/cuentas-tiktok?setup=1&shopId=${encodeURIComponent(shopId)}&shopCipher=${encodeURIComponent(shopCipher)}` +
        `&nombre=${encodeURIComponent(sellerName)}&accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`,
        req.url
      )
    )
    response.cookies.delete('tiktok_oauth_state')
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[tiktok callback]', err)
    return NextResponse.redirect(new URL(`/cuentas-tiktok?error=${encodeURIComponent(msg)}`, req.url))
  }
}
