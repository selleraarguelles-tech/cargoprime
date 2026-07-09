import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import FacturaDocumento from '@/components/FacturaDocumento'
import PrintButton from '@/components/PrintButton'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function PortalFacturaDetalle({ params }: Props) {
  const clienteId = await getSellerClienteId()
  const { id } = await params

  const factura = await prisma.factura.findUnique({
    where: { id: parseInt(id) },
    include: { cliente: { select: { nombre: true, email: true } }, lineas: true },
  })

  // Aislamiento: solo su propia factura y solo si está emitida/pagada.
  if (!factura || factura.clienteId !== clienteId) notFound()
  if (factura.estado === 'borrador') redirect('/portal/facturas')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/portal/facturas" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Volver a facturas
        </Link>
        <PrintButton />
      </div>

      <FacturaDocumento
        numero={`#${String(factura.id).padStart(4, '0')}`}
        cliente={factura.cliente}
        periodo={factura.periodo}
        estado={factura.estado}
        createdAt={factura.createdAt}
        lineas={factura.lineas}
        subtotal={factura.subtotal}
        iva={factura.iva}
        total={factura.total}
      />
    </div>
  )
}
