// CSRF / origin validation helper.
// Checks that the Origin or Referer header matches the configured app domain.
// Provides a defence-in-depth layer alongside SameSite cookie protection.
//
// Routes excluded from CSRF checks:
//  - GET / HEAD / OPTIONS requests (read-only)
//  - /api/stripe/webhook (uses Stripe signature verification instead)
//  - /api/auth/* (Google OAuth redirect — no body)

import { NextRequest } from 'next/server'

function appHost(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? ''
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/**
 * Returns true if the request origin matches the app domain (or if origin
 * cannot be determined — e.g. server-to-server / curl).
 */
export function isSameOrigin(req: NextRequest): boolean {
  const host = appHost()
  if (!host) return true // APP_URL not configured — can't validate, allow through

  const origin  = req.headers.get('origin')
  const referer = req.headers.get('referer')

  if (origin) {
    try { return new URL(origin).host === host } catch { return false }
  }
  if (referer) {
    try { return new URL(referer).host === host } catch { return false }
  }

  // No origin or referer: likely a server-to-server call — allow
  return true
}

/**
 * Returns a 403 response if the request origin does not match.
 * Use in POST/PATCH/DELETE routes that accept unauthenticated submissions.
 */
export function csrfError() {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
