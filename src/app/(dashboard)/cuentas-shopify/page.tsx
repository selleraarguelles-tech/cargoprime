import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import CuentasShopifyClient from './CuentasShopifyClient'

export const dynamic = 'force-dynamic'

export default async function CuentasShopifyPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  const [cuentas, clientes] = await Promise.all([
    prisma.cuentaShopify.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { id: true, nombre: true } } },
    }),
    prisma.cliente.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
  ])

  return (
    <CuentasShopifyClient
      cuentas={cuentas.map(c => ({
        id: c.id,
        nombre: c.nombre,
        shopDomain: c.shopDomain,
        clienteId: c.clienteId,
        clienteNombre: c.cliente.nombre,
        activo: c.activo,
        createdAt: c.createdAt.toISOString(),
      }))}
      clientes={clientes}
    />
  )
}
