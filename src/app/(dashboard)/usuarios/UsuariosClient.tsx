'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Badge from '@/components/Badge'
import { Plus, X, Eye, EyeOff, KeyRound, Pencil, UserX, UserCheck, ShieldCheck } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Usuario {
  id: number
  username: string
  nombre: string
  email: string
  rol: string
  activo: boolean
  createdAt: string
}

interface Props { usuarios: Usuario[] }

export default function UsuariosClient({ usuarios }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [selected, setSelected] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  function openEditar(u: Usuario) { setSelected(u); setModal('editar'); setError('') }
  function close() { setModal(null); setSelected(null); setError('') }

  async function handleCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { close(); router.refresh() } else { const d = await res.json(); setError(d.error ?? 'Error') }
    setLoading(false)
  }

  async function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setLoading(true); setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/usuarios/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { close(); router.refresh() } else { const d = await res.json(); setError(d.error ?? 'Error') }
    setLoading(false)
  }

  async function toggleActivo(u: Usuario) {
    await fetch(`/api/usuarios/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !u.activo }) })
    router.refresh()
  }

  async function resetearDirecto(u: Usuario) {
    if (!confirm(`¿Enviar una contraseña temporal por email a "${u.nombre}" (${u.email})?`)) return
    const res = await fetch(`/api/usuarios/${u.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminReset: true }),
    })
    const d = await res.json()
    if (res.ok) {
      alert(`Contraseña temporal enviada al correo ${u.email}`)
      router.refresh()
    } else {
      alert(`Error: ${d.error ?? 'No se pudo enviar el correo'}`)
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Usuarios del sistema</h2>
          <button
            onClick={() => { setModal('crear'); setError('') }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo usuario
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Alta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">@{u.username}</td>
                  <td className="px-4 py-3 text-gray-700">{u.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.rol === 'admin'
                      ? <Badge variant="orange"><ShieldCheck className="w-3 h-3 inline mr-1" />Admin</Badge>
                      : <Badge variant="default">Solo lectura</Badge>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.activo ? 'success' : 'danger'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditar(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => resetearDirecto(u)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Enviar contraseña temporal por email">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleActivo(u)} className={`p-1.5 rounded transition-colors ${u.activo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={u.activo ? 'Desactivar' : 'Activar'}>
                        {u.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal === 'crear' ? 'Nuevo usuario' : `Editar @${selected?.username}`}</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={modal === 'crear' ? handleCrear : handleEditar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Usuario *</label>
                  <input name="username" required defaultValue={selected?.username} disabled={modal === 'editar'} placeholder="nombre_usuario" className={`${inputClass} ${modal === 'editar' ? 'bg-gray-50' : ''}`} />
                </div>
                <div>
                  <label className={labelClass}>Nombre completo *</label>
                  <input name="nombre" required defaultValue={selected?.nombre} placeholder="Juan García" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input name="email" type="email" required defaultValue={selected?.email} placeholder="email@empresa.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Rol *</label>
                <select name="rol" required defaultValue={selected?.rol ?? 'readonly'} className={inputClass}>
                  <option value="readonly">Solo lectura</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {modal === 'crear' && (
                <div>
                  <label className={labelClass}>Contraseña *</label>
                  <div className="relative">
                    <input name="password" type={showPwd ? 'text' : 'password'} required minLength={6} placeholder="Mínimo 6 caracteres" className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                  {loading ? 'Guardando...' : modal === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
