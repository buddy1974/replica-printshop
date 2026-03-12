import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserByEmail } from '@/lib/user'
import { mergeGuestCart } from '@/lib/cart'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { logAction, logError } from '@/lib/log'
import { isValidEmail, stripHtml } from '@/lib/inputValidation'

export async function POST(req: NextRequest) {
  try {
    // Step 307 — rate limit login/register (20 req/min per IP)
    if (!checkRateLimit(getClientIp(req), 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
    }

    const body = await req.json()
    const { email, name } = body

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const safeName = name && typeof name === 'string' ? stripHtml(name).slice(0, 128) : undefined

    // Capture guest session before overwriting (for cart merge)
    const guestUserId = req.cookies.get('replica_uid')?.value ?? null

    const user = await getOrCreateUserByEmail(email, safeName)

    // Merge any guest cart items into the authenticated user's cart
    if (guestUserId && guestUserId !== user.id) {
      mergeGuestCart(guestUserId, user.id).catch(() => {})
    }

    // Step 336
    logAction('LOGIN', 'user', { userId: user.id, data: { email } })

    // Set cookie server-side so the next request immediately has the right session
    const response = NextResponse.json(user)
    response.cookies.set('replica_uid', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false, // must be readable by client JS (session.ts)
    })
    return response
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/user' })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
