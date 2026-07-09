import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SeguridadClient from './SeguridadClient'

export const dynamic = 'force-dynamic'

export default async function SeguridadPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
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
