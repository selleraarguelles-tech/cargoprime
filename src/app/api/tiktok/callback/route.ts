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

    // Los tokens NO viajan por la URL (historial/logs): se pasan en una cookie
    // httpOnly de corta vida que solo lee el servidor al pintar la página de setup.
    const payload = Buffer.from(
      JSON.stringify({ shopId, shopCipher, nombre: sellerName, accessToken, refreshToken })
    ).toString('base64')

    const response = NextResponse.redirect(new URL('/cuentas-tiktok?setup=1', req.url))
    response.cookies.set('tiktok_pending', payload, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    })
    response.cookies.delete('tiktok_oauth_state')
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[tiktok callback]', err)
    return NextResponse.redirect(new URL(`/cuentas-tiktok?error=${encodeURIComponent(msg)}`, req.url))
  }
}
