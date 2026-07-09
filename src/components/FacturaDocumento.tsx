import { Boxes } from 'lucide-react'

interface Linea { concepto: string; cantidad: number; precioUnitario: number; importe: number }

interface Props {
  numero: string
  cliente: { nombre: string; email: string }
  periodo: string
  estado: string
  createdAt: string | Date
  lineas: Linea[]
  subtotal: number
  iva: number
  total: number
}

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

function periodoLabel(periodo: string) {
  const [y, m] = periodo.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const ESTADO_LABEL: Record<string, { txt: string; cls: string }> = {
  borrador: { txt: 'Borrador', cls: 'bg-slate-100 text-slate-600' },
  emitida: { txt: 'Emitida', cls: 'bg-blue-100 text-blue-700' },
  pagada: { txt: 'Pagada', cls: 'bg-emerald-100 text-emerald-700' },
}

export default function FacturaDocumento({ numero, cliente, periodo, estado, createdAt, lineas, subtotal, iva, total }: Props) {
  const est = ESTADO_LABEL[estado] ?? ESTADO_LABEL.borrador
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-3xl mx-auto print:shadow-none print:border-0">
      {/* Cabecera */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#e0b437] to-[#c9a227] flex items-center justify-center shadow">
            <Boxes className="w-6 h-6 text-[#0d1526]" />
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900 leading-tight">Cargo<span className="text-[#c9a227]">Prime</span></p>
            <p className="text-xs text-gray-400">Logística y fulfillment · info@cargoprime.es</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Factura</p>
          <p className="font-mono font-semibold text-gray-900">{numero}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${est.cls}`}>{est.txt}</span>
        </div>
      </div>

      {/* Datos */}
      <div className="grid grid-cols-2 gap-6 py-6 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cliente</p>
          <p className="font-medium text-gray-900">{cliente.nombre}</p>
          <p className="text-gray-500">{cliente.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Periodo</p>
          <p className="font-medium text-gray-900">{periodoLabel(periodo)}</p>
          <p className="text-gray-500">Emitida: {new Date(createdAt).toLocaleDateString('es-ES')}</p>
        </div>
      </div>

      {/* Líneas */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-gray-100 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <th className="py-2">Concepto</th>
            <th className="py-2 text-right">Cantidad</th>
            <th className="py-2 text-right">Precio unit.</th>
            <th className="py-2 text-right">Importe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {lineas.length === 0 ? (
            <tr><td colSpan={4} className="py-6 text-center text-gray-400">Sin actividad facturable en el periodo.</td></tr>
          ) : lineas.map((l, i) => (
            <tr key={i}>
              <td className="py-2.5 text-gray-700">{l.concepto}</td>
              <td className="py-2.5 text-right text-gray-600">{l.cantidad}</td>
              <td className="py-2.5 text-right text-gray-600">{eur(l.precioUnitario)}</td>
              <td className="py-2.5 text-right font-medium text-gray-900">{eur(l.importe)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="flex justify-end pt-4">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{eur(subtotal)}</span></div>
          <div className="flex justify-between text-gray-600"><span>IVA</span><span>{eur(iva)}</span></div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1"><span>Total</span><span>{eur(total)}</span></div>
        </div>
      </div>
    </div>
  )
}
