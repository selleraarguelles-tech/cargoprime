import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PedidosFilters from './PedidosFilters'
import SyncAllButton from './SyncAllButton'
import ImportarCsvButton from './ImportarCsvButton'
import PedidosTabla from './PedidosTabla'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ estado?: string; cliente?: string; buscar?: string; desde?: string; hasta?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

  const params = await searchParams
  const { estado, cliente, buscar, desde, hasta } = params

  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: 'asc' } })

  // Filtros comunes (todos menos el estado) para poder contar por estado en la barra de flujo
  const whereBase: Record<string, unknown> = {}
  if (cliente) whereBase.clienteId = parseInt(cliente)
  if (buscar) {
    whereBase.OR = [
      { amazonOrderId: { contains: buscar } },
      { destinatarioNombre: { contains: buscar } },
      { destinatarioCiudad: { contains: buscar } },
    ]
  }
  if (desde || hasta) {
    const createdAt: Record<string, Date> = {}
    if (desde) createdAt.gte = new Date(`${desde}T00:00:00`)
    if (hasta) createdAt.lte = new Date(`${hasta}T23:59:59.999`)
    whereBase.createdAt = createdAt
  }

  const where = { ...whereBase }
  if (estado) where.estado = estado

  const [pedidos, porEstado] = await Promise.all([
    prisma.pedido.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { nombre: true } }, producto: { select: { nombre: true } } },
    }),
    prisma.pedido.groupBy({ by: ['estado'], where: whereBase, _count: { _all: true } }),
  ])

  const cuenta = (e: string) => porEstado.find(p => p.estado === e)?._count._all ?? 0
  const conteos = {
    total: porEstado.reduce((a, p) => a + p._count._all, 0),
    sin_etiqueta: cuenta('sin_etiqueta'),
    preparando: cuenta('preparando'),
    enviado: cuenta('enviado'),
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} en la vista actual</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <ImportarCsvButton clientes={clientes.map(c => ({ id: c.id, nombre: c.nombre }))} />
            <SyncAllButton />
            <Link href="/pedidos/nuevo" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Nuevo pedido
            </Link>
          </div>
        )}
      </div>

      <PedidosFilters clientes={clientes} estadoActivo={estado} clienteActivo={cliente} buscarActivo={buscar} desdeActivo={desde} hastaActivo={hasta} />

      <PedidosTabla
        isAdmin={isAdmin}
        estadoActivo={estado}
        conteos={conteos}
        pedidos={pedidos.map(p => ({
          id: p.id,
          amazonOrderId: p.amazonOrderId,
          canal: p.canal,
          clienteNombre: p.cliente.nombre,
          destinatarioNombre: p.destinatarioNombre,
          destinatarioCiudad: p.destinatarioCiudad,
          destinatarioCP: p.destinatarioCP,
          productoNombre: p.producto.nombre,
          createdAt: p.createdAt.toISOString(),
          estado: p.estado,
          trackingNumber: p.trackingNumber,
          transportista: p.transportista,
          trackingEstado: p.trackingEstado,
        }))}
      />
    </div>
  )
}
