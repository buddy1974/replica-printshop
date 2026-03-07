import { NextRequest, NextResponse } from 'next/server'
import { calculatePrice } from '@/lib/pricing'
import { AppError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, variantId, width, height, quantity, deliveryType, optionValueIds } = body

    if (!productId || !quantity) {
      return NextResponse.json({ error: 'productId and quantity are required' }, { status: 400 })
    }

    const result = await calculatePrice({ productId, variantId, width, height, quantity, deliveryType, optionValueIds })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
