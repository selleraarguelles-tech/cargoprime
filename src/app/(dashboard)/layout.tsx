import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import SessionWrapper from '@/components/SessionWrapper'
import AutoRefresh from '@/components/AutoRefresh'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const user = {
    name: session.user?.name ?? '',
    role: session.user?.role ?? 'readonly',
    username: session.user?.username ?? '',
  }

  return (
    <SessionWrapper>
      <AutoRefresh intervalMs={30000} />
      <div className="flex h-full bg-gray-50">
        <Sidebar user={user} />
        <main className="flex-1 overflow-auto print:overflow-visible">
          {children}
        </main>
      </div>
    </SessionWrapper>
  )
}
