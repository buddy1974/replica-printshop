'use client'

import { useEffect, useState } from 'react'
import { getUserId } from '@/lib/session'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setUserId(getUserId())
    setChecked(true)
  }, [])

  if (!checked) return null

  if (!userId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
        Not logged in
      </div>
    )
  }

  return <>{children}</>
}
