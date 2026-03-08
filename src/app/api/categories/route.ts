import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

export async function GET() {
  try {
    const categories = await db.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
