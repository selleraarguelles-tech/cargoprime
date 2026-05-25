import { NextRequest, NextResponse } from 'next/server'
import { getAmazonConfig } from '@/lib/config'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get('clienteId')

  if (!clienteId || isNaN(Number(clienteId))) {
    return NextResponse.redirect(new URL('/autorizar?error=Enlace+inválido', req.url))
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) } })
  if (!cliente) {
    return NextResponse.redirect(new URL('/autorizar?error=Cliente+no+encontrado', req.url))
  }

  const cfg = await getAmazonConfig()
  if (!cfg.isConfigured || !cfg.appId) {
    return NextResponse.redirect(
      new URL(`/autorizar?c=${clienteId}&error=App+no+configurada`, req.url)
    )
  }

  const state = crypto.randomUUID()
  const consentUrl =
    `https://sellercentral.amazon.es/apps/authorize/consent` +
    `?application_id=${cfg.appId}&state=${state}&version=beta`

  const response = NextResponse.redirect(consentUrl)
  response.cookies.set('amazon_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' })
  response.cookies.set('amazon_oauth_clienteid', clienteId, { httpOnly: true, maxAge: 600, path: '/' })
  return response
}
