'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UserCircle,
  Settings,
  SlidersHorizontal,
  LogOut,
  ShieldCheck,
  Eye,
  ShoppingBag,
  Truck,
  Music2,
  Store,
  BarChart3,
  Boxes,
  ChevronLeft,
  PackageCheck,
  Radar,
} from 'lucide-react'

interface SidebarUser {
  name: string
  role: string
  username: string
}

interface Props {
  user: SidebarUser
}

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

interface NavGroup {
  label: string
  admin?: boolean
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
      { href: '/etiquetas', label: 'Por preparar', icon: PackageCheck },
      { href: '/seguimiento', label: 'Seguimiento', icon: Radar },
      { href: '/reportes', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    label: 'Almacén',
    items: [
      { href: '/inventario', label: 'Inventario', icon: Package },
      { href: '/envios', label: 'Envíos entrantes', icon: Truck },
      { href: '/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    label: 'Integraciones',
    admin: true,
    items: [
      { href: '/cuentas-amazon', label: 'Amazon', icon: ShoppingBag },
      { href: '/cuentas-tiktok', label: 'TikTok Shop', icon: Music2 },
      { href: '/cuentas-shopify', label: 'Shopify', icon: Store },
    ],
  },
  {
    label: 'Administración',
    admin: true,
    items: [
      { href: '/usuarios', label: 'Usuarios', icon: Settings },
      { href: '/configuracion', label: 'Configuración', icon: SlidersHorizontal },
    ],
  },
]

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const isAdmin = user.role === 'admin'
  const [collapsed, setCollapsed] = useState(false)

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-64'} bg-[#0d1526] text-white flex flex-col shrink-0 transition-[width] duration-200 print:hidden`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center gap-3 border-b border-white/5 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#e0b437] to-[#c9a227] flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/30">
          <Boxes className="w-5 h-5 text-[#0d1526]" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-[15px] tracking-tight">
              Cargo<span className="text-[#e0b437]">Prime</span>
            </p>
            <p className="text-[10px] text-slate-400">Logística de calidad</p>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3">
        {groups.map((group) => {
          if (group.admin && !isAdmin) return null
          return (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <p className="px-5 pt-3 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="mx-3 my-2 border-t border-white/5" />}
              <div className="px-2 space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={`relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
                      } ${
                        active
                          ? 'bg-[#1c2942] text-white'
                          : 'text-slate-300 hover:bg-[#172136] hover:text-white'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#f97316]" />
                      )}
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#f97316]' : ''}`} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Usuario */}
      <div className="border-t border-white/5 p-3 space-y-1">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5">
              <div className="w-8 h-8 rounded-full bg-[#1c2942] flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-slate-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate">{user.name}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  {isAdmin ? <ShieldCheck className="w-3 h-3 text-[#e0b437]" /> : <Eye className="w-3 h-3" />}
                  {isAdmin ? 'Administrador' : 'Solo lectura'}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Link href="/perfil" className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-300 hover:bg-[#172136] hover:text-white transition-colors">
                <UserCircle className="w-4 h-4" /> Perfil
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-300 hover:bg-red-500/15 hover:text-red-300 transition-colors">
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => signOut({ callbackUrl: '/login' })} title="Cerrar sesión" className="w-full flex items-center justify-center py-2.5 rounded-lg text-slate-300 hover:bg-red-500/15 hover:text-red-300 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-slate-500 hover:bg-[#172136] hover:text-slate-300 transition-colors"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  )
}
