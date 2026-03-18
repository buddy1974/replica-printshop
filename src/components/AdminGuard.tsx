'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'loading' | 'ok' | 'denied'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/user/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatus(data?.role === 'ADMIN' || data?.role === 'SUPERADMIN' ? 'ok' : 'denied'))
      .catch(() => setStatus('denied'))
  }, [])

  useEffect(() => {
    if (status === 'denied') {
      router.replace('/login')
    }
  }, [status, router])

  // Show nothing while checking or redirecting
  if (status !== 'ok') return null

  return <>{children}</>
}
