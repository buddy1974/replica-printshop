import { NextRequest, NextResponse } from 'next/server'
import { getCart, addToCart } from '@/lib/cart'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { logAction, logError } from '@/lib/log'

// Step 302 — verify cookie userId matches requested userId (if cookie is set)
function cartAccessDenied(req: NextRequest, userId: string): boolean {
  const cookieUserId = req.cookies.get('replica_uid')?.value
  return !!cookieUserId && cookieUserId !== userId
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    if (cartAccessDenied(req, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const cart = await getCart(userId)
    return NextResponse.json(cart)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(getClientKey(req), 30, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
    }

    const body = await req.json()
    const { userId, productId, variantId, width, height, quantity, express, optionValueIds, placement } = body

    if (!userId || !productId || !quantity) {
      return NextResponse.json({ error: 'userId, productId and quantity are required' }, { status: 400 })
    }
    if (cartAccessDenied(req, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const cart = await addToCart({ userId, productId, variantId, width, height, quantity, express, optionValueIds, placement })
    // Step 334
    logAction('CART_ADD', 'cart', { userId, data: { productId, variantId, quantity, width, height } })
    return NextResponse.json(cart, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/cart' })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
