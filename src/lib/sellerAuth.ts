import { auth } from '@/auth'
import { redirect } from 'next/navigation'

/**
 * Garantiza que quien accede al portal es un seller con Cliente asignado y
 * devuelve su clienteId. TODA consulta del portal debe filtrar por este id
 * para no filtrar datos de otros clientes (aislamiento multi-tenant).
 */
export async function getSellerClienteId(): Promise<number> {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user?.role !== 'seller' || !session.user?.clienteId) redirect('/')
  return session.user.clienteId
}
