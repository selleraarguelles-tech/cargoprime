'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { CANALES } from '@/lib/utils'

interface Cliente { id: number; nombre: string }

export default function ImportarCsvButton({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [canal, setCanal] = useState('tiktok')
  const [resultado, setResultado] = useState<{ ok: boolean; creados?: number; omitidos?: number; total?: number; error?: string; errores?: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function close() {
    setOpen(false); setResultado(null); setClienteId(''); setCanal('tiktok')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function importar(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !clienteId) return
    setLoading(true); setResultado(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('clienteId', clienteId)
    fd.append('canal', canal)
    const res = await fetch('/api/pedidos/importar', { method: 'POST', body: fd })
    const data = await res.json()
    setResultado(res.ok ? data : { ok: false, error: data.error })
    setLoading(false)
    if (res.ok && data.creados > 0) router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Upload className="w-4 h-4" />
        Importar CSV
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Importar pedidos desde CSV</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={importar} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                Exporta los pedidos desde el panel del canal (p. ej. TikTok Shop → Pedidos → Exportar) y sube aquí el archivo <b>.csv</b>. Si es Excel, guárdalo como CSV. Se detectan solas las columnas (Nº pedido, destinatario, dirección, CP, ciudad, producto, SKU…).
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canal *</label>
                <select value={canal} onChange={e => setCanal(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  {Object.entries(CANALES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo CSV *</label>
                <input ref={fileRef} type="file" accept=".csv,text/csv" required className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500 file:text-white file:text-sm file:font-medium hover:file:bg-orange-600 file:cursor-pointer" />
              </div>

              {resultado && (
                <div className={`rounded-lg p-3 text-sm flex gap-2 ${resultado.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                  {resultado.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <div>
                    {resultado.ok ? (
                      <>
                        <p className="font-medium">{resultado.creados} pedidos importados</p>
                        <p className="text-xs mt-0.5">{resultado.total} en el archivo · {resultado.omitidos} omitidos (duplicados o sin nº)</p>
                        {resultado.errores && resultado.errores.length > 0 && <p className="text-xs text-amber-700 mt-1">Avisos: {resultado.errores.join(' · ')}</p>}
                      </>
                    ) : resultado.error}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                  {resultado?.ok ? 'Cerrar' : 'Cancelar'}
                </button>
                <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60">
                  <FileSpreadsheet className="w-4 h-4" />
                  {loading ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
