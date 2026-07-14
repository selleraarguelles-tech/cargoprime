import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Truck } from 'lucide-react'
import RecepcionClient from './RecepcionClient'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function EnvioDetallePage({ params }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/envios')

  const { id } = await params
  const envio = await prisma.envio.findUnique({
    where: { id: parseInt(id) },
    include: {
      cliente: { select: { id: true, nombre: true } },
      lineas: { include: { producto: { select: { sku: true, nombre: true } } }, orderBy: { id: 'asc' } },
    },
  })
  if (!envio) notFound()

  const productos = await prisma.producto.findMany({
    where: { clienteId: envio.clienteId },
    orderBy: { nombre: 'asc' },
    select: { id: true, sku: true, nombre: true },
  })

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link href="/envios" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Volver a envíos entrantes
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-400" /> Recepción · envío #{envio.id}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {envio.cliente.nombre} · {envio.transportista} · <span className="font-mono text-xs">{envio.trackingNumber}</span>
            {envio.fechaEsperada && <> · esperado el {formatDate(envio.fechaEsperada)}</>}
          </p>
          {envio.descripcion && <p className="text-gray-400 text-xs mt-1">{envio.descripcion}</p>}
        </div>
      </div>

      <RecepcionClient
        envioId={envio.id}
        recibido={!!envio.recibidoAt}
        recibidoAt={envio.recibidoAt?.toISOString() ?? null}
        productos={productos}
        lineas={envio.lineas.map(l => ({
          id: l.id,
          sku: l.producto.sku,
          nombre: l.producto.nombre,
          esperada: l.cantidadEsperada,
          recibida: l.cantidadRecibida,
        }))}
      />
    </div>
  )
}
