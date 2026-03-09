interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Prune expired entries every 5 minutes to avoid memory growth
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key)
  })
}, 5 * 60 * 1000)

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key    Unique key (e.g. IP address)
 * @param limit  Max requests per window (default 30)
 * @param windowMs  Window size in ms (default 60 000 = 1 min)
 */
export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}

export function getClientIp(req: Request): string {
  const forwarded = (req.headers as Headers).get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() ?? '127.0.0.1'
}

// Step 268 — prefer cookie userId over IP for rate-limit key
import { NextRequest } from 'next/server'
export function getClientKey(req: NextRequest): string {
  const uid = req.cookies.get('replica_uid')?.value
  if (uid) return `u:${uid}`
  const forwarded = req.headers.get('x-forwarded-for')
  return `ip:${forwarded?.split(',')[0].trim() ?? '127.0.0.1'}`
}
