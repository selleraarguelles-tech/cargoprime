'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refreshId = setInterval(() => router.refresh(), intervalMs)

    // Every 5 minutes, sync new Amazon orders in the background
    const syncId = setInterval(async () => {
      try {
        await fetch('/api/cron/sync-orders')
        router.refresh()
      } catch {}
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(refreshId)
      clearInterval(syncId)
    }
  }, [router, intervalMs])

  return null
}
