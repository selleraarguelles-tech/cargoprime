'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  clienteId: number
  inicial: { amazon: string; tiktok: string; shopify: string }
}

const CANALES: { key: 'amazon' | 'tiktok' | 'shopify'; label: string }[] = [
  { key: 'amazon', label: 'Amazon' },
  { key: 'tiktok', label: 'TikTok Shop' },
  { key: 'shopify', label: 'Shopify' },
]

export default function TransportistasCliente({ clienteId, inicial }: Props) {
  const router = useRouter()
  const [prefs, setPrefs] = useState(inicial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  async function guardar() {
    setSaving(true); setMsg(null)
    const res = await fetch(`/api/clientes/${clienteId}/transportistas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    setSaving(false)
    if (res.ok) {
      setMsg({ ok: true, texto: 'Transportistas guardados' })
      setTimeout(() => setMsg(null), 3000)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setMsg({ ok: false, texto: d.error ?? 'Error al guardar' })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="bg-orange-50 rounded-lg p-2">
          <Truck className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Transportista por canal</h2>
          <p className="text-xs text-gray-500">Con qué transportista se generan las etiquetas de este cliente en cada canal</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CANALES.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <select
                value={prefs[key]}
                onChange={e => setPrefs(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="ctt">CTT Express</option>
                <option value="cex">Correos Express</option>
              </select>
            </div>
          ))}
        </div>

        {msg && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {msg.texto}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Se aplica al botón principal de etiqueta y a los lotes.</p>
          <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
