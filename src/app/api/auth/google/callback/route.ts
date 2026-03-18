import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserByEmail } from '@/lib/user'
import { mergeGuestCart } from '@/lib/cart'
import { logAction, logError } from '@/lib/log'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL('/', req.url).origin
  const loginUrl = new URL('/login', baseUrl)

  console.log('[auth/callback] START baseUrl=%s code=%s oauthError=%s', baseUrl, code ? 'present' : 'missing', oauthError ?? 'none')

  if (oauthError) {
    console.log('[auth/callback] Google returned error:', oauthError)
    loginUrl.searchParams.set('error', 'Google sign-in was cancelled')
    return NextResponse.redirect(loginUrl.toString())
  }

  // CSRF check
  const storedState = req.cookies.get('oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    console.log('[auth/callback] CSRF state mismatch state=%s stored=%s', state, storedState)
    loginUrl.searchParams.set('error', 'Invalid OAuth state — please try again')
    return NextResponse.redirect(loginUrl.toString())
  }

  if (!code) {
    console.log('[auth/callback] No authorization code')
    loginUrl.searchParams.set('error', 'No authorization code received')
    return NextResponse.redirect(loginUrl.toString())
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[auth/callback] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing')
    loginUrl.searchParams.set('error', 'Google OAuth not configured')
    return NextResponse.redirect(loginUrl.toString())
  }

  // Capture the current session before overwriting (for guest cart merge)
  const guestUserId = req.cookies.get('replica_uid')?.value ?? null

  // Return URL stored by /api/auth/google (e.g. /checkout)
  const authReturn = req.cookies.get('auth_return')?.value ?? ''
  const safeReturn = authReturn.startsWith('/') && !authReturn.startsWith('//') ? authReturn : ''

  try {
    const redirectUri = `${baseUrl}/api/auth/google/callback`
    console.log('[auth/callback] Exchanging token redirectUri=%s', redirectUri)

    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      console.error('[auth/callback] Token exchange failed status=%d body=%s', tokenRes.status, body)
      loginUrl.searchParams.set('error', 'Failed to exchange Google token')
      return NextResponse.redirect(loginUrl.toString())
    }

    console.log('[auth/callback] Token exchange OK')
    const tokens = await tokenRes.json()

    // Get user profile from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoRes.ok) {
      console.error('[auth/callback] UserInfo fetch failed status=%d', userInfoRes.status)
      loginUrl.searchParams.set('error', 'Failed to retrieve Google profile')
      return NextResponse.redirect(loginUrl.toString())
    }

    const googleUser = await userInfoRes.json()
    const email: string = googleUser.email
    const name: string | undefined = googleUser.name

    console.log('[auth/callback] Google profile email=%s name=%s', email, name)

    if (!email) {
      console.error('[auth/callback] Google profile has no email')
      loginUrl.searchParams.set('error', 'Google account has no email')
      return NextResponse.redirect(loginUrl.toString())
    }

    console.log('[auth/callback] Calling getOrCreateUserByEmail')
    const user = await getOrCreateUserByEmail(email, name)
    console.log('[auth/callback] User OK id=%s role=%s', user.id, user.role)

    // Merge any guest cart items into the authenticated user's cart
    if (guestUserId && guestUserId !== user.id) {
      mergeGuestCart(guestUserId, user.id).catch(() => {})
    }

    logAction('LOGIN', 'user', { userId: user.id, data: { email, provider: 'google' } })

    // Build /auth/complete URL, carrying returnTo if one was set
    const completeUrl = new URL('/auth/complete', baseUrl)
    if (safeReturn) completeUrl.searchParams.set('returnTo', safeReturn)

    console.log('[auth/callback] Redirecting to completeUrl=%s', completeUrl.toString())

    const response = NextResponse.redirect(completeUrl.toString())
    response.cookies.set('replica_uid', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false, // must be readable by client JS (session.ts)
    })
    // Clear CSRF state and return cookie
    response.cookies.delete('oauth_state')
    response.cookies.delete('auth_return')

    return response
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error('[auth/callback] CAUGHT ERROR:', err.message)
    console.error('[auth/callback] Stack:', err.stack)
    logError(err.message, { stack: err.stack, path: '/api/auth/google/callback' })
    loginUrl.searchParams.set('error', 'Authentication failed — please try again')
    return NextResponse.redirect(loginUrl.toString())
  }
}
