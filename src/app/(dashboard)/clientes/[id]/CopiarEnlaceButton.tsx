'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export default function CopiarEnlaceButton({ clienteId }: { clienteId: number }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    const url = `${window.location.origin}/autorizar?c=${clienteId}`
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <button
      onClick={copiar}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {copiado ? (
        <>
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Enlace copiado</span>
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4 text-gray-500" />
          Copiar enlace de autorización Amazon
        </>
      )}
    </button>
  )
}
