'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setUserId, setUserEmail } from '@/lib/session'

// Syncs localStorage session after server-side OAuth login (e.g. Google).
// The replica_uid cookie is already set by the OAuth callback; we just need
// to populate localStorage so the client-side session helpers work correctly.
export default function AuthCompletePage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/user/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.id) {
          setUserId(user.id)
          setUserEmail(user.email)
        }
        router.replace('/shop')
      })
      .catch(() => router.replace('/shop'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Signing you in…
    </div>
  )
}
