import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { logAction, logError } from '@/lib/log'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)
    const adminId = req.cookies.get('replica_uid')?.value
    const body = await req.json()
    const { pricePerM2, minPrice, expressMultiplier = 1.5 } = body

    if (pricePerM2 === undefined || minPrice === undefined) {
      return NextResponse.json({ error: 'pricePerM2 and minPrice are required' }, { status: 400 })
    }

    const rule = await db.pricingRule.create({
      data: { productId: params.id, pricePerM2, minPrice, expressMultiplier },
    })
    // Step 335
    logAction('ADMIN_PRICE_EDIT', 'product', { userId: adminId, entityId: params.id, data: { pricePerM2, minPrice } })
    return NextResponse.json(rule, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: `/api/products/${params.id}/pricing` })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
