import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { notFound } from 'next/navigation'
import { getTransportistaPreferido } from '@/lib/transportistaPref'
import EtiquetaView from './EtiquetaView'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function EtiquetaPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()])
  const isAdmin = session?.user?.role === 'admin'

  const pedido = await prisma.pedido.findUnique({
    where: { id: parseInt(id) },
    include: { cliente: true, producto: true },
  })

  if (!pedido) notFound()

  const preferido = await getTransportistaPreferido(pedido.clienteId, pedido.canal)

  return <EtiquetaView pedido={pedido} isAdmin={isAdmin} preferido={preferido} />
}
