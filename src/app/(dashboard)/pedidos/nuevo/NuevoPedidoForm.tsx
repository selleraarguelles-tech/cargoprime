'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Producto { id: number; nombre: string; sku: string }
interface Cliente { id: number; nombre: string; productos: Producto[] }

interface Props { clientes: Cliente[] }

export default function NuevoPedidoForm({ clientes }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clienteId, setClienteId] = useState('')

  const productosCliente = clientes.find(c => c.id === parseInt(clienteId))?.productos ?? []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const carrier = data.carrier // 'ctt' | 'cex' | '' (elegir después)
    delete data.carrier

    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error ?? 'Error al crear el pedido')
      setLoading(false)
      return
    }

    const pedido = await res.json()

    // Si se eligió compañía, se genera y descarga la etiqueta directamente
    if (carrier === 'ctt' || carrier === 'cex') {
      try {
        const lres = await fetch(`/api/pedidos/${pedido.id}/${carrier}-label`, { method: 'POST' })
        if (!lres.ok) {
          const d = await lres.json().catch(() => ({}))
          throw new Error(d.error ?? 'Error al generar la etiqueta')
        }
        const blob = await lres.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `etiqueta-${carrier}-${pedido.amazonOrderId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        alert(`El envío se creó, pero la etiqueta falló: ${err instanceof Error ? err.message : 'error'}. Puedes reintentarlo desde la vista de etiqueta.`)
      }
    }

    router.push(`/etiquetas/${pedido.id}`)
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Cliente *</label>
          <select name="clienteId" required value={clienteId} onChange={e => setClienteId(e.target.value)} className={inputClass}>
            <option value="">Seleccionar cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Producto</label>
          <select name="productoId" disabled={!clienteId} className={inputClass}>
            <option value="">Envío externo (sin producto del catálogo)</option>
            {productosCliente.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">Si eliges un producto se descuenta 1 ud. de stock; si no, no toca inventario.</p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Nº de pedido (opcional)</label>
        <input name="amazonOrderId" placeholder="Déjalo vacío para un envío externo: se genera una referencia MAN-..." className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">Solo rellénalo si corresponde a un pedido real de Amazon.</p>
      </div>

      <hr className="border-gray-100" />
      <h3 className="font-medium text-gray-900">Datos del destinatario</h3>

      <div>
        <label className={labelClass}>Nombre completo *</label>
        <input name="destinatarioNombre" required placeholder="Juan García López" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Dirección *</label>
        <input name="destinatarioDireccion" required placeholder="Calle Mayor 123, 2ºA" className={inputClass} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Código Postal *</label>
          <input name="destinatarioCP" required placeholder="28001" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ciudad *</label>
          <input name="destinatarioCiudad" required placeholder="Madrid" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>País</label>
          <input name="destinatarioPais" defaultValue="España" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Peso (kg)</label>
          <input name="peso" type="number" step="0.01" min="0" placeholder="0.50" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Compañía de envío</label>
          <select name="carrier" className={inputClass}>
            <option value="">Elegir después (en la etiqueta)</option>
            <option value="ctt">CTT Express</option>
            <option value="cex">Correos Express</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Si eliges una, la etiqueta se genera y descarga al crear el envío.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-60 transition-colors">
          {loading ? 'Creando pedido...' : 'Crear pedido e imprimir etiqueta'}
        </button>
      </div>
    </form>
  )
}
