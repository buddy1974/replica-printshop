// Security middleware — admin guard, rate limiting, locale routing
// Step 301 — Admin guard (first layer of defence)
// Step 710 — URL language routing (/en, /de, /fr prefix)
// Step 718 — Security: rate limit on auth + contact; env check at startup

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { checkEnv } from '@/lib/envCheck'

// Check env vars once at module load (startup warning only, never throws)
checkEnv()

const SUPPORTED_LOCALES = ['en', 'de', 'fr'] as const
type SupportedLocale = typeof SUPPORTED_LOCALES[number]

function getLocaleFromPath(pathname: string): { locale: SupportedLocale | null; strippedPath: string } {
  const firstSeg = pathname.split('/')[1]
  if ((SUPPORTED_LOCALES as readonly string[]).includes(firstSeg)) {
    const locale = firstSeg as SupportedLocale
    const stripped = pathname.slice(locale.length + 1) || '/'
    return { locale, strippedPath: stripped }
  }
  return { locale: null, strippedPath: pathname }
}

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return `ip:${forwarded?.split(',')[0].trim() ?? '127.0.0.1'}`
}

// Routes with stricter rate limits (requests per 60 s per IP)
const RATE_LIMITS: Array<{ prefix: string; limit: number }> = [
  { prefix: '/api/auth/',    limit: 10 },  // OAuth initiation
  { prefix: '/api/contact',  limit: 5  },  // Contact form
  { prefix: '/api/checkout', limit: 15 },  // Checkout
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Rate limiting for sensitive API endpoints ────────────────────────────
  if (pathname.startsWith('/api/')) {
    const rule = RATE_LIMITS.find((r) => pathname.startsWith(r.prefix))
    if (rule) {
      const key = `${rule.prefix}:${getIp(req)}`
      if (!checkRateLimit(key, rule.limit, 60_000)) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait before trying again.' },
          { status: 429 }
        )
      }
    }
  }

  // ── Admin API routes — cookie presence check ─────────────────────────────
  if (pathname.startsWith('/api/admin/')) {
    const uid = req.cookies.get('replica_uid')?.value
    if (!uid) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── All other API routes — pass through ──────────────────────────────────
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // ── Locale routing for pages ─────────────────────────────────────────────
  const { locale, strippedPath } = getLocaleFromPath(pathname)

  // Admin page auth check (handles /admin and /en/admin, /de/admin, etc.)
  if (strippedPath.startsWith('/admin')) {
    const uid = req.cookies.get('replica_uid')?.value
    if (!uid) {
      const loginLocale = locale ?? 'en'
      const loginUrl = new URL(`/${loginLocale}/login`, req.url)
      loginUrl.searchParams.set('returnTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (locale) {
    // Has valid locale prefix → rewrite internally to path without locale, set cookie
    const res = NextResponse.rewrite(new URL(strippedPath, req.url))
    res.cookies.set('replica_locale', locale, { path: '/', sameSite: 'lax' })
    return res
  } else {
    // No locale prefix → redirect to preferred locale
    const preferred = req.cookies.get('replica_locale')?.value
    const targetLocale: SupportedLocale =
      preferred && (SUPPORTED_LOCALES as readonly string[]).includes(preferred)
        ? (preferred as SupportedLocale)
        : 'en'
    return NextResponse.redirect(new URL(`/${targetLocale}${pathname}${req.nextUrl.search}`, req.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|images/).*)'],
}
