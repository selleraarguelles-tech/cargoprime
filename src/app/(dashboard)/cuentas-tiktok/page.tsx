import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTikTokConfig } from '@/lib/config'
import CuentasTikTokClient from './CuentasTikTokClient'

export const dynamic = 'force-dynamic'

export default async function CuentasTikTokPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

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
    />
  )
}
