import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getTikTokConfig } from '@/lib/config'
import CuentasTikTokClient from './CuentasTikTokClient'

export const dynamic = 'force-dynamic'

interface PendingTikTok { shopId: string; shopCipher: string; nombre: string; accessToken: string; refreshToken: string }

export default async function CuentasTikTokPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  // Conexión recién autorizada: los tokens llegan por cookie httpOnly (no por la URL)
  let pending: PendingTikTok | null = null
  const pendingRaw = (await cookies()).get('tiktok_pending')?.value
  if (pendingRaw) {
    try { pending = JSON.parse(Buffer.from(pendingRaw, 'base64').toString('utf8')) } catch { pending = null }
  }

  const [cuentas, clientes, cfg] = await Promise.all([
    prisma.cuentaTikTok.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { id: true, nombre: true } } },
    }),
    prisma.cliente.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
    getTikTokConfig(),
  ])

  return (
    <CuentasTikTokClient
      cuentas={cuentas.map(c => ({
        id: c.id,
        nombre: c.nombre,
        shopId: c.shopId,
        clienteId: c.clienteId,
        clienteNombre: c.cliente.nombre,
        activo: c.activo,
        createdAt: c.createdAt.toISOString(),
      }))}
      clientes={clientes}
      configured={cfg.isConfigured}
      pending={pending}
    />
  )
}
