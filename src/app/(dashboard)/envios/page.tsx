import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { TRANSPORTISTAS } from '@/lib/transportistas'
import EnviosClient from './EnviosClient'
import EnviosFilters from './EnviosFilters'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}

export default async function EnviosPage({ searchParams }: Props) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

  const { desde, hasta } = await searchParams

  const where: Record<string, unknown> = {}
  if (desde || hasta) {
    const createdAt: Record<string, Date> = {}
    if (desde) createdAt.gte = new Date(`${desde}T00:00:00`)
    if (hasta) createdAt.lte = new Date(`${hasta}T23:59:59.999`)
    where.createdAt = createdAt
  }

  const [envios, clientes] = await Promise.all([
    prisma.envio.findMany({
      where,
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
      filters={<EnviosFilters desdeActivo={desde} hastaActivo={hasta} />}
      hasActiveFilters={Boolean(desde || hasta)}
    />
  )
}
