import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import { exchangeAuthCode } from '@/lib/spapi'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('spapi_oauth_code')
  const sellerId = searchParams.get('selling_partner_id')
  const rawState = searchParams.get('state') ?? ''
  const errorParam = searchParams.get('error')

  // State can be plain UUID (admin flow) or "nonce|public|clienteId" (public flow)
  const stateParts = rawState.split('|')
  const isPublicFlowByState = stateParts.length === 3 && stateParts[1] === 'public'
  const clienteIdFromState = isPublicFlowByState ? stateParts[2] : null
  const stateNonce = stateParts[0]

  const clienteIdFromCookie = req.cookies.get('amazon_oauth_clienteid')?.value
  const effectiveClienteId = clienteIdFromCookie ?? clienteIdFromState
  const isPublicFlow = !!(clienteIdFromCookie || isPublicFlowByState)

  if (!isPublicFlow) {
    const session = await auth()
    if (session?.user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  function redirectError(msg: string) {
    if (isPublicFlow && effectiveClienteId) {
      return NextResponse.redirect(
        new URL(`/autorizar?c=${effectiveClienteId}&error=${encodeURIComponent(msg)}`, req.url)
      )
    }
    return NextResponse.redirect(
      new URL(`/cuentas-amazon?error=${encodeURIComponent(msg)}`, req.url)
    )
  }

  if (errorParam) return redirectError(errorParam)
  if (!code || !sellerId) return redirectError('missing_params')

  const savedNonce = req.cookies.get('amazon_oauth_state')?.value
  if (isPublicFlow) {
    // Validate nonce when cookie is present; if cookies were lost (in-app browser), skip
    if (savedNonce && stateNonce !== savedNonce) return redirectError('invalid_state')
  } else {
    // Admin flow: strict CSRF validation required
    if (!savedNonce || savedNonce !== rawState) return redirectError('invalid_state')
  }

  const cfg = await getAmazonConfig()
  if (!cfg.isConfigured || !cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    return NextResponse.redirect(new URL('/configuracion?error=amazon_not_configured', req.url))
  }

  try {
    const { refreshToken } = await exchangeAuthCode(code, {
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      redirectUri: cfg.redirectUri,
    })

    const existing = await prisma.cuentaAmazon.findUnique({ where: { sellerId } })

    if (existing) {
      await prisma.cuentaAmazon.update({
        where: { sellerId },
        data: { refreshToken, activo: true },
      })
      const response = isPublicFlow
        ? NextResponse.redirect(new URL('/autorizar?success=1', req.url))
        : NextResponse.redirect(new URL('/cuentas-amazon?reconnected=1', req.url))
      response.cookies.delete('amazon_oauth_state')
      response.cookies.delete('amazon_oauth_clienteid')
      return response
    }

    if (isPublicFlow && effectiveClienteId) {
      await prisma.cuentaAmazon.create({
        data: {
          nombre: sellerId,
          sellerId,
          clienteId: Number(effectiveClienteId),
          refreshToken,
          marketplaceId: 'A1RKKUPIHCS9HS',
        },
      })
      const response = NextResponse.redirect(new URL('/autorizar?success=1', req.url))
      response.cookies.delete('amazon_oauth_state')
      response.cookies.delete('amazon_oauth_clienteid')
      return response
    }

    // Admin flow — redirect to UI to complete setup
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
    return redirectError(msg)
  }
}
