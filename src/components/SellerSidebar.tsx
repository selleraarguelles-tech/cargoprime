'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, ShoppingCart, Package, BarChart3, ShieldCheck, Boxes, Building2, LogOut, Receipt, TrendingUp } from 'lucide-react'

interface Props {
  user: { name: string; empresa: string }
}

const items = [
  { href: '/portal', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/portal/pedidos', label: 'Mis pedidos', icon: ShoppingCart },
  { href: '/portal/inventario', label: 'Inventario', icon: Package },
  { href: '/portal/rentabilidad', label: 'Rentabilidad', icon: TrendingUp },
  { href: '/portal/facturas', label: 'Facturas', icon: Receipt },
  { href: '/portal/informes', label: 'Informes', icon: BarChart3 },
  { href: '/portal/seguridad', label: 'Seguridad', icon: ShieldCheck },
]

export default function SellerSidebar({ user }: Props) {
  const pathname = usePathname()
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  return (
    <aside className="w-64 bg-[#0d1526] text-white flex flex-col shrink-0 print:hidden">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 border-b border-white/5 px-5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#e0b437] to-[#c9a227] flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/30">
          <Boxes className="w-5 h-5 text-[#0d1526]" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-bold text-[15px] tracking-tight">Cargo<span className="text-[#e0b437]">Prime</span></p>
          <p className="text-[10px] text-slate-400">Portal de cliente</p>
        </div>
      </div>

      {/* Empresa */}
      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tu empresa</p>
        <p className="text-sm font-medium text-white flex items-center gap-1.5 mt-0.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-[#e0b437] shrink-0" /> {user.empresa}
        </p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-lg text-sm font-medium px-3 py-2 transition-colors ${
                active ? 'bg-[#1c2942] text-white' : 'text-slate-300 hover:bg-[#172136] hover:text-white'
              }`}
            >
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#f97316]" />}
              <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#f97316]' : ''}`} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-white/5">
          <p className="text-[13px] font-medium text-white truncate">{user.name}</p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-red-300 transition-colors shrink-0 ml-2"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>
    </aside>
  )
}
