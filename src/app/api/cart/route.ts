import { NextRequest, NextResponse } from 'next/server'
import { getCart, addToCart } from '@/lib/cart'
import { AppError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
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
    const body = await req.json()
    const { userId, productId, variantId, width, height, quantity, express, optionValueIds, placement } = body

    if (!userId || !productId || !quantity) {
      return NextResponse.json({ error: 'userId, productId and quantity are required' }, { status: 400 })
    }

    const cart = await addToCart({ userId, productId, variantId, width, height, quantity, express, optionValueIds, placement })
    return NextResponse.json(cart, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
