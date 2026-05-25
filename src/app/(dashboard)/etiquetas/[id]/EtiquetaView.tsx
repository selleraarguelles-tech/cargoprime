'use client'

import { useState } from 'react'
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface Pedido {
  id: number
  amazonOrderId: string
  destinatarioNombre: string
  destinatarioDireccion: string
  destinatarioCP: string
  destinatarioCiudad: string
  destinatarioPais: string
  peso: number | null
  transportista: string | null
  trackingNumber: string | null
  estado: string
  createdAt: Date
  cliente: { nombre: string }
  producto: { nombre: string; sku: string }
}

interface Props { pedido: Pedido; isAdmin?: boolean }

export default function EtiquetaView({ pedido, isAdmin = false }: Props) {
  const router = useRouter()
  const [marcando, setMarcando] = useState(false)

  async function marcarPreparando() {
    if (pedido.estado !== 'sin_etiqueta') return
    setMarcando(true)
    await fetch(`/api/pedidos/${pedido.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'preparando' }),
    })
    setMarcando(false)
    router.refresh()
  }

  function imprimir() {
    window.print()
  }

  return (
    <>
      {/* Barra de acciones — solo en pantalla, no se imprime */}
      <div className="print:hidden p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/etiquetas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
            Volver a etiquetas
          </Link>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vista previa de etiqueta</h1>
            <p className="text-gray-500 text-sm mt-1">Pedido {pedido.amazonOrderId}</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && pedido.estado === 'sin_etiqueta' && (
              <button
                onClick={marcarPreparando}
                disabled={marcando}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4 text-green-500" />
                {marcando ? 'Actualizando...' : 'Marcar como preparando'}
              </button>
            )}
            <button
              onClick={imprimir}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir etiqueta
            </button>
          </div>
        </div>

        <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center">
          <Etiqueta pedido={pedido} />
        </div>
      </div>

      {/* Solo en impresión */}
      <div className="hidden print:block">
        <Etiqueta pedido={pedido} />
      </div>
    </>
  )
}

function Etiqueta({ pedido }: Props) {
  return (
    <div
      className="bg-white border-2 border-black font-mono"
      style={{ width: '10cm', height: '15cm', padding: '0.5cm', display: 'flex', flexDirection: 'column', gap: '0.3cm', boxSizing: 'border-box' }}
    >
      {/* Cabecera */}
      <div style={{ borderBottom: '1.5px solid black', paddingBottom: '0.3cm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '7pt', color: '#666' }}>REMITENTE</p>
            <p style={{ fontSize: '9pt', fontWeight: 'bold' }}>{pedido.cliente.nombre}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '6pt', color: '#666' }}>AMAZON FBM</p>
            <p style={{ fontSize: '7pt' }}>{formatDate(pedido.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Pedido Amazon */}
      <div style={{ borderBottom: '1px dashed #999', paddingBottom: '0.25cm' }}>
        <p style={{ fontSize: '6.5pt', color: '#666', marginBottom: '1px' }}>Nº PEDIDO AMAZON</p>
        <p style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.02cm' }}>{pedido.amazonOrderId}</p>
      </div>

      {/* Destinatario — sección más grande */}
      <div style={{ flex: 1, borderBottom: '1.5px solid black', paddingBottom: '0.3cm' }}>
        <p style={{ fontSize: '6.5pt', color: '#666', marginBottom: '0.15cm' }}>DESTINATARIO</p>
        <p style={{ fontSize: '13pt', fontWeight: 'bold', lineHeight: 1.2 }}>{pedido.destinatarioNombre}</p>
        <p style={{ fontSize: '9.5pt', marginTop: '0.2cm', lineHeight: 1.4 }}>{pedido.destinatarioDireccion}</p>
        <p style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '0.15cm' }}>
          {pedido.destinatarioCP} {pedido.destinatarioCiudad.toUpperCase()}
        </p>
        <p style={{ fontSize: '9pt', marginTop: '0.1cm' }}>{pedido.destinatarioPais.toUpperCase()}</p>
      </div>

      {/* Producto y detalles */}
      <div style={{ borderBottom: '1px dashed #999', paddingBottom: '0.2cm' }}>
        <p style={{ fontSize: '6.5pt', color: '#666', marginBottom: '1px' }}>CONTENIDO</p>
        <p style={{ fontSize: '8.5pt' }}>{pedido.producto.nombre}</p>
        <p style={{ fontSize: '7pt', color: '#555' }}>SKU: {pedido.producto.sku}</p>
      </div>

      {/* Pie */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {pedido.transportista && (
          <div>
            <p style={{ fontSize: '6.5pt', color: '#666' }}>TRANSPORTISTA</p>
            <p style={{ fontSize: '9pt', fontWeight: 'bold' }}>{pedido.transportista}</p>
          </div>
        )}
        {pedido.peso && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '6.5pt', color: '#666' }}>PESO</p>
            <p style={{ fontSize: '9pt', fontWeight: 'bold' }}>{pedido.peso} kg</p>
          </div>
        )}
        {pedido.trackingNumber && (
          <div>
            <p style={{ fontSize: '6.5pt', color: '#666' }}>TRACKING</p>
            <p style={{ fontSize: '7.5pt' }}>{pedido.trackingNumber}</p>
          </div>
        )}
      </div>
    </div>
  )
}
