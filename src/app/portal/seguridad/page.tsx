import { prisma } from '@/lib/prisma'
import { getSellerClienteId } from '@/lib/sellerAuth'
import { auth } from '@/auth'
import SeguridadClient from '@/app/(dashboard)/seguridad/SeguridadClient'

export const dynamic = 'force-dynamic'

export default async function PortalSeguridad() {
  await getSellerClienteId() // garantiza que es un seller válido
  const session = await auth()

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session!.user.id) },
    select: { twoFactorEnabled: true },
  })

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Seguridad</h1>
        <p className="text-gray-500 text-sm mt-1">Protege tu cuenta con verificación en dos pasos.</p>
      </div>
      <SeguridadClient enabled={!!user?.twoFactorEnabled} />
    </div>
  )
}
