import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import SessionWrapper from '@/components/SessionWrapper'
import AutoRefresh from '@/components/AutoRefresh'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  // Los sellers no acceden al panel interno: se les lleva a su portal.
  if (session.user?.role === 'seller') redirect('/portal')

  const isAdmin = session.user?.role === 'admin'
  const user = {
    name: session.user?.name ?? '',
    role: session.user?.role ?? 'readonly',
    username: session.user?.username ?? '',
  }

  return (
    <SessionWrapper>
      <AutoRefresh intervalMs={30000} />
      <div className="flex h-full bg-[#f0f2f7]">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar user={{ name: user.name, role: user.role }} isAdmin={isAdmin} />
          <main className="flex-1 overflow-auto print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </SessionWrapper>
  )
}
