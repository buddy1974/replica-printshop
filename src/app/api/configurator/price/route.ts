import { NextRequest, NextResponse } from 'next/server'
import { calculatePrice } from '@/lib/pricing'
import { AppError } from '@/lib/errors'
import { logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, variantId, width, height, quantity, deliveryType, optionValueIds } = body

    console.log('[price] input:', { width, height, optionValueIds, deliveryType, quantity })

    if (!productId || !quantity) {
      return NextResponse.json({ error: 'productId and quantity are required' }, { status: 400 })
    }

    const result = await calculatePrice({ productId, variantId, width, height, quantity, deliveryType, optionValueIds })
    return NextResponse.json(result)
  } catch (e) {
    // Step 273 — safe pricing: return readable message, log actual error
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    logError('Pricing calculation failed', e, { productId: req.url })
    return NextResponse.json({ error: 'Price could not be calculated. Please check your selections and try again.' }, { status: 500 })
  }
}
