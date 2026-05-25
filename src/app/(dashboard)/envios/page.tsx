import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { TRANSPORTISTAS } from '@/lib/transportistas'
import EnviosClient from './EnviosClient'

export const dynamic = 'force-dynamic'

export default async function EnviosPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

  const [envios, clientes] = await Promise.all([
    prisma.envio.findMany({
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    isAdmin ? prisma.cliente.findMany({ orderBy: { nombre: 'asc' } }) : Promise.resolve([]),
  ])

  return (
    <EnviosClient
      envios={envios}
      clientes={clientes}
      transportistas={TRANSPORTISTAS}
      isAdmin={isAdmin}
    />
  )
}
