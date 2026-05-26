'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function SyncButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSync() {
    setLoading(true)
    try {
      await fetch('/api/cron/sync-orders')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="inline-flex items-center gap-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Actualizando...' : 'Actualizar'}
    </button>
  )
}
