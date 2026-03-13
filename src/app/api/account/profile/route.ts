import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, UnauthorizedError, ValidationError } from '@/lib/errors'

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) throw new UnauthorizedError('Not logged in')

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : null
    if (!name) throw new ValidationError('Name is required')

    const user = await db.user.update({ where: { id: userId }, data: { name } })
    return NextResponse.json({ id: user.id, name: user.name })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
