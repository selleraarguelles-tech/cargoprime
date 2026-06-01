'use client'

import { useState } from 'react'
import { Truck, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Barcode from 'react-barcode'

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
  const [generando, setGenerando] = useState(false)
  const [errorCTT, setErrorCTT] = useState('')

  async function generarEtiquetaCTT() {
    setGenerando(true)
    setErrorCTT('')
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}/ctt-label`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al generar etiqueta')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etiqueta-${pedido.amazonOrderId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      router.refresh()
    } catch (e: unknown) {
      setErrorCTT(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setGenerando(false)
    }
  }

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

  return (
    <>
      <div className="p-6 space-y-4">
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
              onClick={generarEtiquetaCTT}
              disabled={generando}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              <Truck className="w-4 h-4" />
              {generando ? 'Generando etiqueta...' : 'Crear etiqueta CTT'}
            </button>
          </div>
        </div>

        {errorCTT && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {errorCTT}
          </div>
        )}

        <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center">
          <Etiqueta pedido={pedido} />
        </div>
      </div>

    </>
  )
}

function Etiqueta({ pedido }: Props) {
  const s: React.CSSProperties = {
    width: '10.16cm',
    height: '15.24cm',
    padding: '0.4cm',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    fontFamily: 'Arial, Helvetica, sans-serif',
    backgroundColor: 'white',
    border: '1px solid #000',
  }

  return (
    <div style={s}>

      {/* CABECERA: logo + vendedor + barcode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '0.25cm', marginBottom: '0.2cm' }}>
        <div>
          {/* Logo amazon estilo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '3px' }}>
            <span style={{ fontSize: '16pt', fontWeight: '900', letterSpacing: '-0.5px', color: '#000' }}>amazon</span>
            {/* flecha naranja debajo */}
          </div>
          <div style={{ width: '70px', height: '3px', background: 'linear-gradient(to right, #FF9900 60%, transparent 100%)', borderRadius: '2px', marginTop: '-2px', marginBottom: '4px' }} />
          <p style={{ fontSize: '6pt', color: '#444', margin: 0 }}>Vendido por</p>
          <p style={{ fontSize: '7.5pt', fontWeight: 'bold', margin: 0 }}>{pedido.cliente.nombre}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Barcode
            value={pedido.amazonOrderId}
            format="CODE128"
            width={1.2}
            height={35}
            fontSize={7}
            margin={0}
            displayValue={true}
          />
        </div>
      </div>

      {/* DESTINATARIO — sección principal */}
      <div style={{ flex: 1, borderBottom: '2px solid #000', paddingBottom: '0.2cm', marginBottom: '0.2cm' }}>
        <p style={{ fontSize: '6.5pt', fontWeight: 'bold', color: '#444', letterSpacing: '0.05cm', marginBottom: '0.15cm' }}>DESTINATARIO</p>
        <p style={{ fontSize: '14pt', fontWeight: '900', lineHeight: 1.15, margin: '0 0 0.2cm 0' }}>
          {pedido.destinatarioNombre.toUpperCase()}
        </p>
        <p style={{ fontSize: '9.5pt', lineHeight: 1.4, margin: '0 0 0.1cm 0' }}>
          {pedido.destinatarioDireccion}
        </p>
        <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0 0 0.05cm 0' }}>
          {pedido.destinatarioCP} {pedido.destinatarioCiudad.toUpperCase()}
        </p>
        <p style={{ fontSize: '9pt', margin: 0, color: '#222' }}>
          {pedido.destinatarioPais.toUpperCase()}
        </p>
      </div>

      {/* PEDIDO + PRODUCTO */}
      <div style={{ borderBottom: '1px dashed #888', paddingBottom: '0.15cm', marginBottom: '0.15cm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '6pt', color: '#555', margin: '0 0 1px 0' }}>Nº PEDIDO AMAZON</p>
            <p style={{ fontSize: '8.5pt', fontWeight: 'bold', letterSpacing: '0.02cm', margin: 0 }}>{pedido.amazonOrderId}</p>
          </div>
          {pedido.peso && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '6pt', color: '#555', margin: '0 0 1px 0' }}>PESO</p>
              <p style={{ fontSize: '8.5pt', fontWeight: 'bold', margin: 0 }}>{pedido.peso} kg</p>
            </div>
          )}
        </div>
        <p style={{ fontSize: '7pt', color: '#444', margin: '0.1cm 0 1px 0' }}>ARTÍCULO</p>
        <p style={{ fontSize: '7.5pt', margin: '0 0 1px 0' }}>{pedido.producto.nombre.slice(0, 80)}</p>
        <p style={{ fontSize: '6.5pt', color: '#555', margin: 0 }}>SKU: {pedido.producto.sku}</p>
      </div>

      {/* PIE: transportista + tracking */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {pedido.transportista ? (
          <div>
            <p style={{ fontSize: '6pt', color: '#555', margin: '0 0 1px 0' }}>TRANSPORTISTA</p>
            <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: 0 }}>{pedido.transportista.toUpperCase()}</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '6pt', color: '#555', margin: '0 0 1px 0' }}>SERVICIO</p>
            <p style={{ fontSize: '8pt', fontWeight: 'bold', margin: 0 }}>ESTÁNDAR</p>
          </div>
        )}
        {pedido.trackingNumber && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '6pt', color: '#555', margin: '0 0 1px 0' }}>TRACKING</p>
            <p style={{ fontSize: '7pt', fontWeight: 'bold', margin: 0 }}>{pedido.trackingNumber}</p>
          </div>
        )}
      </div>

    </div>
  )
}
