import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import FacturaDocumento from '@/components/FacturaDocumento'
import FacturaAcciones from './FacturaAcciones'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function FacturaDetallePage({ params }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  const { id } = await params
  const factura = await prisma.factura.findUnique({
    where: { id: parseInt(id) },
    include: { cliente: { select: { nombre: true, email: true } }, lineas: true },
  })
  if (!factura) notFound()

  const numero = `#${String(factura.id).padStart(4, '0')}`

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/facturacion" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Volver a facturación
        </Link>
        <FacturaAcciones id={factura.id} estado={factura.estado} />
      </div>

      <FacturaDocumento
        numero={numero}
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
