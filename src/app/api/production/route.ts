import { NextResponse } from 'next/server'
import { getQueue } from '@/lib/production'
import { AppError } from '@/lib/errors'

export async function GET() {
  try {
    const queue = await getQueue()
    return NextResponse.json(queue)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
