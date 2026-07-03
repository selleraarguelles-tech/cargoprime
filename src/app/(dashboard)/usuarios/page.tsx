import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import UsuariosClient from './UsuariosClient'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/')

  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      createdAt: true,
    },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Gestión de usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}</p>
      </div>

      <UsuariosClient
        usuarios={usuarios.map(u => ({
          id: u.id,
          username: u.username,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          activo: u.activo,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
