import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserByEmail } from '@/lib/user'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    // Step 307 — rate limit login/register (20 req/min per IP)
    if (!checkRateLimit(getClientIp(req), 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
    }

    const body = await req.json()
    const { email, name } = body

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const user = await getOrCreateUserByEmail(email, name)
    return NextResponse.json(user)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
