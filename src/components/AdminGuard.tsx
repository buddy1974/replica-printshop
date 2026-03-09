'use client'

import { useEffect, useState } from 'react'

type Status = 'loading' | 'ok' | 'denied'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    fetch('/api/user/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatus(data?.isAdmin ? 'ok' : 'denied'))
      .catch(() => setStatus('denied'))
  }, [])

  if (status === 'loading') return null

  if (status === 'denied') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
        Admin access required
      </div>
    )
  }

  return <>{children}</>
}
