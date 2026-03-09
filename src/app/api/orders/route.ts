import { NextRequest, NextResponse } from 'next/server'
import { DeliveryType } from '@/generated/prisma/client'
import { createOrderFromCart } from '@/lib/order'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // cartUserId: identifies the cart (required). userId: stored on order (null = guest)
    const { userId, cartUserId, deliveryType, billingAddress, shippingAddress, saveAddress } = body as {
      userId?: string | null
      cartUserId?: string
      deliveryType: DeliveryType
      billingAddress?: { name: string; street: string; city: string; zip: string; country: string }
      shippingAddress?: { name: string; street: string; city: string; zip: string; country: string }
      saveAddress?: boolean
    }

    const resolvedCartUserId = cartUserId ?? userId
    if (!resolvedCartUserId || !deliveryType) {
      return NextResponse.json({ error: 'cartUserId (or userId) and deliveryType are required' }, { status: 400 })
    }

    const order = await createOrderFromCart(resolvedCartUserId, deliveryType, {
      orderUserId: userId ?? null,
      billingAddress,
      shippingAddress,
      saveAddress,
    })
    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const orders = await db.order.findMany({
      where: userId ? { userId } : undefined,
      include: { items: true, shippingMethod: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(orders)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
