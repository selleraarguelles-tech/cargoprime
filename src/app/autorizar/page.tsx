import { prisma } from '@/lib/prisma'
import { Link2, CheckCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ c?: string; success?: string; error?: string }>
}

export default async function AutorizarPage({ searchParams }: Props) {
  const { c: clienteId, success, error } = await searchParams

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Cuenta conectada</h1>
          <p className="text-gray-500 text-sm">
            Tu cuenta de Amazon ha sido conectada correctamente. El almacén ya puede gestionar tus pedidos.
          </p>
        </div>
      </div>
    )
  }

  if (!clienteId || isNaN(Number(clienteId))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Enlace inválido</h1>
          <p className="text-gray-500 text-sm">
            Este enlace de autorización no es válido. Contacta con el almacén para obtener uno nuevo.
          </p>
        </div>
      </div>
    )
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: Number(clienteId) } })

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Cliente no encontrado</h1>
          <p className="text-gray-500 text-sm">Contacta con el almacén para obtener un nuevo enlace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Conectar cuenta de Amazon</h1>
          <p className="text-gray-500 text-sm mt-2">
            El almacén necesita que autorices el acceso a tu cuenta de{' '}
            <span className="font-medium text-gray-700">Seller Central</span> para gestionar
            tus envíos FBM.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Qué se autoriza:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Lectura de tus pedidos de Amazon</li>
            <li>• Generación de etiquetas de envío</li>
            <li>• No se realizarán compras ni cambios en tu cuenta</li>
          </ul>
        </div>

        <a
          href={`/api/amazon/connect-publico?clienteId=${clienteId}`}
          className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-3 px-4 rounded-xl font-medium transition-colors"
        >
          Conectar con Amazon Seller Central
        </a>

        <p className="text-center text-xs text-gray-400">
          Serás redirigido a Amazon para autorizar el acceso de forma segura.
        </p>
      </div>
    </div>
  )
}
