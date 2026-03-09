import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  try {
    const methods = await db.shippingMethod.findMany({ orderBy: { type: 'asc' } })
    return NextResponse.json(methods)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { name, price, type } = await req.json()
    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }
    const method = await db.shippingMethod.create({
      data: { name, price: price ?? 0, type },
    })
    return NextResponse.json(method, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
