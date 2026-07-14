'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Search, Settings, UserCircle } from 'lucide-react'
import CampanaNotificaciones from './CampanaNotificaciones'

interface Props {
  user: { name: string; role: string }
  isAdmin: boolean
}

export default function Topbar({ user, isAdmin }: Props) {
  const router = useRouter()
  const [q, setQ] = useState('')

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/pedidos?buscar=${encodeURIComponent(term)}` : '/pedidos')
  }

  return (
    <header className="h-16 bg-white border-b border-[#e4e8f0] flex items-center gap-4 px-6 shrink-0 print:hidden">
      <form onSubmit={buscar} className="flex-1 max-w-xl mx-auto relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          type="search"
          placeholder="Buscar pedido, destinatario o ciudad..."
          className="w-full bg-[#f0f2f7] border border-transparent focus:bg-white focus:border-orange-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
        />
      </form>

      <div className="flex items-center gap-1 shrink-0">
        <CampanaNotificaciones />
        {isAdmin && (
          <Link href="/configuracion" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Configuración">
            <Settings className="w-[18px] h-[18px]" />
          </Link>
        )}
        <Link href="/perfil" className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="text-right hidden sm:block leading-tight">
            <p className="text-[13px] font-medium text-gray-900">{user.name}</p>
            <p className="text-[11px] text-gray-400">{isAdmin ? 'Administrador' : 'Solo lectura'}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-white" />
          </div>
        </Link>
      </div>
    </header>
  )
}
