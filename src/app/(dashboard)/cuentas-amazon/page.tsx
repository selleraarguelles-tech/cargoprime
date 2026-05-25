import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAmazonConfig } from '@/lib/config'
import CuentasAmazonClient from './CuentasAmazonClient'

export const dynamic = 'force-dynamic'

export default async function CuentasAmazonPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  const [cuentas, clientes, cfg] = await Promise.all([
    prisma.cuentaAmazon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { id: true, nombre: true } } },
    }),
    prisma.cliente.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
    getAmazonConfig(),
  ])

  return (
    <CuentasAmazonClient
      cuentas={cuentas.map(c => ({
        id: c.id,
        nombre: c.nombre,
        sellerId: c.sellerId,
        marketplaceId: c.marketplaceId,
        clienteId: c.clienteId,
        clienteNombre: c.cliente.nombre,
        activo: c.activo,
        isSandbox: c.isSandbox,
        createdAt: c.createdAt.toISOString(),
      }))}
      clientes={clientes}
      configured={cfg.isConfigured}
    />
  )
}
