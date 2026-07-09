import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import FacturacionClient from './FacturacionClient'

export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ periodo?: string }> }

function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function FacturacionPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  const { periodo: periodoParam } = await searchParams
  const periodo = /^\d{4}-\d{2}$/.test(periodoParam ?? '') ? periodoParam! : periodoActual()

  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      rateCard: true,
      facturas: { where: { periodo }, select: { id: true, total: true, estado: true } },
    },
  })

  const filas = clientes.map(c => ({
    id: c.id,
    nombre: c.nombre,
    tarifas: {
      cuotaMensual: c.rateCard?.cuotaMensual ?? 0,
      tarifaPedido: c.rateCard?.tarifaPedido ?? 0,
      tarifaRecepcion: c.rateCard?.tarifaRecepcion ?? 0,
      tarifaUnidadAlmacen: c.rateCard?.tarifaUnidadAlmacen ?? 0,
      iva: c.rateCard?.iva ?? 21,
      configurada: !!c.rateCard,
    },
    factura: c.facturas[0] ?? null,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Facturación</h1>
        <p className="text-gray-500 text-sm mt-1">Tarifas por cliente y generación de facturas mensuales.</p>
      </div>
      <FacturacionClient periodo={periodo} filas={filas} />
    </div>
  )
}
