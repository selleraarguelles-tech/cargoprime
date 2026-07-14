'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Package, Clock, Truck, RotateCcw, ClipboardCheck, CheckCheck } from 'lucide-react'

interface Notif {
  id: number
  tipo: string
  titulo: string
  mensaje: string | null
  href: string | null
  leidaAt: string | null
  createdAt: string
}

const ICONO: Record<string, { Icon: typeof Bell; color: string }> = {
  stock: { Icon: Package, color: 'text-orange-500 bg-orange-50' },
  retraso36: { Icon: Clock, color: 'text-red-500 bg-red-50' },
  entrante48: { Icon: Truck, color: 'text-amber-500 bg-amber-50' },
  recepcion: { Icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50' },
  devolucion: { Icon: RotateCcw, color: 'text-indigo-500 bg-indigo-50' },
}

function hace(fecha: string): string {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export default function CampanaNotificaciones() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/notificaciones')
      if (!res.ok) return
      const d = await res.json()
      setItems(d.items ?? [])
      setNoLeidas(d.noLeidas ?? 0)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    const inicial = setTimeout(cargar, 0) // diferido: evita setState síncrono en el effect
    const int = setInterval(cargar, 60000)
    return () => { clearTimeout(inicial); clearInterval(int) }
  }, [cargar])

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!abierto) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [abierto])

  async function marcarTodas() {
    await fetch('/api/notificaciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todas: true }),
    })
    setNoLeidas(0)
    setItems(prev => prev.map(n => ({ ...n, leidaAt: n.leidaAt ?? new Date().toISOString() })))
  }

  async function abrir(n: Notif) {
    if (!n.leidaAt) {
      fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      })
      setNoLeidas(c => Math.max(0, c - 1))
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, leidaAt: new Date().toISOString() } : x))
    }
    if (n.href) {
      setAbierto(false)
      router.push(n.href)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(v => !v)}
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative"
        title="Notificaciones"
      >
        <Bell className="w-[18px] h-[18px]" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">Notificaciones</p>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">Sin notificaciones</p>
            ) : items.map(n => {
              const cfg = ICONO[n.tipo] ?? { Icon: Bell, color: 'text-gray-400 bg-gray-50' }
              return (
                <button
                  key={n.id}
                  onClick={() => abrir(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${!n.leidaAt ? 'bg-orange-50/40' : ''}`}
                >
                  <span className={`rounded-lg p-2 h-fit shrink-0 ${cfg.color}`}>
                    <cfg.Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm truncate ${!n.leidaAt ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.titulo}</span>
                    {n.mensaje && <span className="block text-xs text-gray-500 truncate">{n.mensaje}</span>}
                    <span className="block text-[11px] text-gray-400 mt-0.5">{hace(n.createdAt)}</span>
                  </span>
                  {!n.leidaAt && <span className="ml-auto mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
