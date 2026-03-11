import { NextResponse } from 'next/server'
import { getOrCreateUserByEmail } from '@/lib/user'

export async function POST() {
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const email = `guest_${rand}@printshop.de`
  const user = await getOrCreateUserByEmail(email)
  return NextResponse.json({ id: user.id, email: user.email })
}
