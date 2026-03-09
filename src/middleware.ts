// Step 301 — Server-side middleware guard for /admin/* paths
// First layer of defense: checks cookie presence.
// Actual isAdmin DB check happens in requireAdmin() within each route / AdminGuard on pages.

import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const uid = req.cookies.get('replica_uid')?.value

  if (!uid) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    // Pages → redirect to login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
