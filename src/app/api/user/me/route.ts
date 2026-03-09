import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('replica_uid')?.value ?? ''
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isAdmin: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(user)
}
