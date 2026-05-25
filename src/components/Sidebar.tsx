'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Users,
  Warehouse,
  UserCircle,
  Settings,
  SlidersHorizontal,
  LogOut,
  ShieldCheck,
  Eye,
  ShoppingBag,
  Truck,
} from 'lucide-react'

interface SidebarUser {
  name: string
  role: string
  username: string
}

interface Props {
  user: SidebarUser
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/etiquetas', label: 'Etiquetas', icon: Tag },
  { href: '/envios', label: 'Envíos entrantes', icon: Truck },
  { href: '/clientes', label: 'Clientes', icon: Users },
]

const adminItems = [
  { href: '/cuentas-amazon', label: 'Cuentas Amazon', icon: ShoppingBag },
  { href: '/usuarios', label: 'Usuarios', icon: Settings },
  { href: '/configuracion', label: 'Configuración', icon: SlidersHorizontal },
]

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = user.role === 'admin'

  function handleLogout() {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0 print:hidden">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 rounded-lg p-2">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Almacén FBM</h1>
            <p className="text-gray-400 text-xs">Gestión logística</p>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Separador y sección admin */}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administración
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Sección inferior: usuario */}
      <div className="p-4 border-t border-gray-700 space-y-1">
        {/* Badge de rol */}
        <div className="flex items-center gap-2 px-3 py-2">
          {isAdmin ? (
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span className={`text-xs font-medium ${isAdmin ? 'text-orange-400' : 'text-gray-400'}`}>
            {isAdmin ? 'Administrador' : 'Solo lectura'}
          </span>
        </div>

        {/* Info usuario */}
        <div className="px-3 py-2 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2.5">
            <UserCircle className="w-8 h-8 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Mi perfil */}
        <Link
          href="/perfil"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <UserCircle className="w-4 h-4 shrink-0" />
          Mi perfil
        </Link>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-red-900/40 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
