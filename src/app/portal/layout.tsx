import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SellerSidebar from '@/components/SellerSidebar'
import SessionWrapper from '@/components/SessionWrapper'
import AutoRefresh from '@/components/AutoRefresh'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  // Solo sellers con Cliente asignado. El resto (staff) va al panel interno.
  if (session.user?.role !== 'seller' || !session.user?.clienteId) redirect('/')

  const cliente = await prisma.cliente.findUnique({
    where: { id: session.user.clienteId },
    select: { nombre: true },
  })

  return (
    <SessionWrapper>
      <AutoRefresh intervalMs={60000} />
      <div className="flex h-full bg-[#f0f2f7]">
        <SellerSidebar user={{ name: session.user.name ?? '', empresa: cliente?.nombre ?? 'Mi empresa' }} />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-auto print:overflow-visible">{children}</main>
        </div>
      </div>
    </SessionWrapper>
  )
}
