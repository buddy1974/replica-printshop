import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserByEmail } from '@/lib/user'
import { logAction, logError } from '@/lib/log'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL('/', req.url).origin
  const loginUrl = new URL('/login', baseUrl)

  if (oauthError) {
    loginUrl.searchParams.set('error', 'Google sign-in was cancelled')
    return NextResponse.redirect(loginUrl.toString())
  }

  // CSRF check
  const storedState = req.cookies.get('oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    loginUrl.searchParams.set('error', 'Invalid OAuth state — please try again')
    return NextResponse.redirect(loginUrl.toString())
  }

  if (!code) {
    loginUrl.searchParams.set('error', 'No authorization code received')
    return NextResponse.redirect(loginUrl.toString())
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    loginUrl.searchParams.set('error', 'Google OAuth not configured')
    return NextResponse.redirect(loginUrl.toString())
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/google/callback`

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
      loginUrl.searchParams.set('error', 'Failed to exchange Google token')
      return NextResponse.redirect(loginUrl.toString())
    }

    const tokens = await tokenRes.json()

    // Get user profile from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoRes.ok) {
      loginUrl.searchParams.set('error', 'Failed to retrieve Google profile')
      return NextResponse.redirect(loginUrl.toString())
    }

    const googleUser = await userInfoRes.json()
    const email: string = googleUser.email
    const name: string | undefined = googleUser.name

    if (!email) {
      loginUrl.searchParams.set('error', 'Google account has no email')
      return NextResponse.redirect(loginUrl.toString())
    }

    const user = await getOrCreateUserByEmail(email, name)
    logAction('LOGIN', 'user', { userId: user.id, data: { email, provider: 'google' } })

    // Set session — redirect to /auth/complete for localStorage sync
    const completeUrl = new URL('/auth/complete', baseUrl)
    const response = NextResponse.redirect(completeUrl.toString())

    response.cookies.set('replica_uid', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false, // must be readable by client JS (session.ts)
    })
    // Clear CSRF state
    response.cookies.delete('oauth_state')

    return response
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/auth/google/callback' })
    loginUrl.searchParams.set('error', 'Authentication failed — please try again')
    return NextResponse.redirect(loginUrl.toString())
  }
}
