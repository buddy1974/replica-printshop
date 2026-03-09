import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'

// Step 322 — admin-only: GET also requires admin
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const rules = await db.shippingRule.findMany({ orderBy: { type: 'asc' } })
    return NextResponse.json(rules)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json()
    const { type, minTotal, price, multiplier } = body

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    const rule = await db.shippingRule.create({
      data: {
        type,
        minTotal: minTotal ?? null,
        price: price ?? null,
        multiplier: multiplier ?? null,
      },
    })
    return NextResponse.json(rule, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { id } = await req.json()
    await db.shippingRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
