'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refreshId = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(refreshId)
  }, [router, intervalMs])

  return null
}
