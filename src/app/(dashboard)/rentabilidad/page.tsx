import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calcularPnL } from '@/lib/pnl'
import RentabilidadClient from './RentabilidadClient'

export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ cliente?: string; periodo?: string }> }

function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function RentabilidadPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  const params = await searchParams
  const periodo = /^\d{4}-\d{2}$/.test(params.periodo ?? '') ? params.periodo! : periodoActual()

  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } })
  if (clientes.length === 0) {
    return <div className="p-6"><h1 className="text-xl font-bold text-gray-900">Rentabilidad</h1><p className="text-gray-500 text-sm mt-2">No hay clientes todavía.</p></div>
  }

  const clienteId = params.cliente && clientes.some(c => c.id === Number(params.cliente))
    ? Number(params.cliente)
    : clientes[0].id

  const resumen = await calcularPnL(clienteId, periodo)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Rentabilidad por producto</h1>
        <p className="text-gray-500 text-sm mt-1">P&L por SKU: ingresos menos coste de producto, comisión de Amazon y fulfillment.</p>
      </div>
      <RentabilidadClient
        clientes={clientes}
        clienteActivo={clienteId}
        periodo={periodo}
        resumen={resumen}
      />
    </div>
  )
}
