import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUserByEmail } from '@/lib/user'
import { AppError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
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
