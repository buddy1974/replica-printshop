import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { pricePerM2, minPrice, expressMultiplier = 1.5 } = body

    if (pricePerM2 === undefined || minPrice === undefined) {
      return NextResponse.json({ error: 'pricePerM2 and minPrice are required' }, { status: 400 })
    }

    const rule = await db.pricingRule.create({
      data: { productId: params.id, pricePerM2, minPrice, expressMultiplier },
    })
    return NextResponse.json(rule, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
