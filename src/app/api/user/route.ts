import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { getOrCreateUserByEmail } from '@/lib/user'
import { mergeGuestCart } from '@/lib/cart'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { logAction, logError } from '@/lib/log'
import { isValidEmail, stripHtml } from '@/lib/inputValidation'

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 20 req/min per IP
    if (!checkRateLimit(getClientIp(req), 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
    }

    const body = await req.json()
    const { email, name, password } = body

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const safeName = name && typeof name === 'string' ? stripHtml(name).slice(0, 128) : undefined
    const guestUserId = req.cookies.get('replica_uid')?.value ?? null

    // Check if this account uses password authentication
    const existing = await db.user.findUnique({ where: { email } })

    let user: { id: string; email: string; name: string | null; role: string; passwordHash?: string | null }

    if (existing?.passwordHash) {
      // Password-protected account — password is required
      if (!password || typeof password !== 'string') {
        return NextResponse.json({ error: 'Password required for this account' }, { status: 401 })
      }
      const valid = await bcrypt.compare(password, existing.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }
      user = existing
    } else {
      // Email-only flow (regular customers)
      user = await getOrCreateUserByEmail(email, safeName)
    }

    if (guestUserId && guestUserId !== user.id) {
      mergeGuestCart(guestUserId, user.id).catch(() => {})
    }

    logAction('LOGIN', 'user', { userId: user.id, data: { email } })

    const response = NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
    response.cookies.set('replica_uid', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
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
