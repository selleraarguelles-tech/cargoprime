'use client'

import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Imprimir / PDF' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <Printer className="w-4 h-4" /> {label}
    </button>
  )
}
