import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL('/', req.url).origin
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  // CSRF state token
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)

  // Optional return URL — e.g. ?returnTo=/checkout
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? ''
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : ''

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'email profile')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('access_type', 'online')

  const res = NextResponse.redirect(authUrl.toString())
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 300, // 5 min
    path: '/',
  })
  // Persist the return destination across the OAuth redirect
  if (safeReturn) {
    res.cookies.set('auth_return', safeReturn, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 300, // 5 min
      path: '/',
    })
  }
  return res
}
