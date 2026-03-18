'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setUserId, setUserEmail } from '@/lib/session'
import { useCart } from '@/context/CartContext'

// Syncs localStorage session after server-side OAuth login (e.g. Google).
// The replica_uid cookie is already set by the OAuth callback; we just need
// to populate localStorage so the client-side session helpers work correctly.
// Then redirects to returnTo (from query string) or /shop.
export default function AuthCompletePage() {
  const router = useRouter()
  const { refresh: refreshCart } = useCart()

  useEffect(() => {
    // Read returnTo from URL without useSearchParams (avoids Suspense requirement)
    const params = new URLSearchParams(window.location.search)
    const returnTo = params.get('returnTo') ?? ''
    const explicitDest = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : ''

    fetch('/api/user/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user?.id) {
          setUserId(user.id)
          setUserEmail(user.email)
        }
        refreshCart()
        // Use explicit returnTo if present; otherwise role-based redirect
        if (explicitDest) {
          router.replace(explicitDest)
        } else if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') {
          router.replace('/admin')
        } else {
          router.replace('/account')
        }
      })
      .catch(() => router.replace(explicitDest || '/account'))
  }, [router, refreshCart])

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Signing you in…
    </div>
  )
}
