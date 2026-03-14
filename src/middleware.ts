// Step 301 — Admin guard (first layer of defence)
// Step 710 — URL language routing (/en, /de, /fr prefix)

import { NextRequest, NextResponse } from 'next/server'

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Admin API routes — auth check only (no locale prefix on API routes)
  if (pathname.startsWith('/api/admin/')) {
    const uid = req.cookies.get('replica_uid')?.value
    if (!uid) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // All other API routes — pass through (no locale routing)
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // --- Locale routing for pages ---
  const { locale, strippedPath } = getLocaleFromPath(pathname)

  // Admin page auth check (handles /admin and /en/admin, /de/admin, etc.)
  if (strippedPath.startsWith('/admin')) {
    const uid = req.cookies.get('replica_uid')?.value
    if (!uid) {
      const loginLocale = locale ?? 'en'
      const loginUrl = new URL(`/${loginLocale}/login`, req.url)
      loginUrl.searchParams.set('redirect', pathname)
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
    return NextResponse.redirect(new URL(`/${targetLocale}${pathname}`, req.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|images/).*)'],
}
