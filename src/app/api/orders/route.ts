import { NextRequest, NextResponse } from 'next/server'
import { DeliveryType } from '@/generated/prisma/client'
import { createOrderFromCart } from '@/lib/order'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(getClientIp(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
    }

    // Resolve session from cookie — no userId in body required
    const cookieUserId = req.cookies.get('replica_uid')?.value ?? null

    const body = await req.json()
    const { deliveryType, billingAddress, shippingAddress, saveAddress } = body as {
      deliveryType: DeliveryType
      billingAddress?: { name: string; street: string; city: string; zip: string; country: string }
      shippingAddress?: { name: string; street: string; city: string; zip: string; country: string }
      saveAddress?: boolean
    }

    if (!cookieUserId || !deliveryType) {
      return NextResponse.json({ error: 'No active session or missing deliveryType' }, { status: 400 })
    }

    const order = await createOrderFromCart(cookieUserId, deliveryType, {
      orderUserId: cookieUserId,
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
    const cookieUserId = req.cookies.get('replica_uid')?.value ?? ''
    if (!cookieUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Admins can query any userId; customers are locked to their own
    const requester = await db.user.findUnique({ where: { id: cookieUserId }, select: { isAdmin: true } })
    let whereUserId: string | undefined

    if (requester?.isAdmin) {
      const param = req.nextUrl.searchParams.get('userId')
      whereUserId = param ?? undefined
    } else {
      whereUserId = cookieUserId
    }

    const orders = await db.order.findMany({
      where: whereUserId ? { userId: whereUserId } : undefined,
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
