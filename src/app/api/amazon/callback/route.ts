import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import { exchangeAuthCode } from '@/lib/spapi'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { searchParams } = req.nextUrl
  const code = searchParams.get('spapi_oauth_code')
  const sellerId = searchParams.get('selling_partner_id')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/cuentas-amazon?error=${encodeURIComponent(errorParam)}`, req.url)
    )
  }

  if (!code || !sellerId) {
    return NextResponse.redirect(
      new URL('/cuentas-amazon?error=missing_params', req.url)
    )
  }

  const savedState = req.cookies.get('amazon_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL('/cuentas-amazon?error=invalid_state', req.url)
    )
  }

  const cfg = await getAmazonConfig()
  if (!cfg.isConfigured || !cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    return NextResponse.redirect(
      new URL('/configuracion?error=amazon_not_configured', req.url)
    )
  }

  try {
    const { refreshToken } = await exchangeAuthCode(code, {
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      redirectUri: cfg.redirectUri,
    })

    // If the seller already has an account, update the token
    const existing = await prisma.cuentaAmazon.findUnique({ where: { sellerId } })
    if (existing) {
      await prisma.cuentaAmazon.update({
        where: { sellerId },
        data: { refreshToken, activo: true },
      })
      const response = NextResponse.redirect(
        new URL('/cuentas-amazon?reconnected=1', req.url)
      )
      response.cookies.delete('amazon_oauth_state')
      return response
    }

    // New account — pass to UI to complete setup (assign client, name, marketplace)
    const response = NextResponse.redirect(
      new URL(
        `/cuentas-amazon?setup=1&sellerId=${encodeURIComponent(sellerId)}&token=${encodeURIComponent(refreshToken)}`,
        req.url
      )
    )
    response.cookies.delete('amazon_oauth_state')
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[amazon callback]', err)
    return NextResponse.redirect(
      new URL(`/cuentas-amazon?error=${encodeURIComponent(msg)}`, req.url)
    )
  }
}
