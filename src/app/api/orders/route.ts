import { NextRequest, NextResponse } from 'next/server'
import { DeliveryType } from '@/generated/prisma/client'
import { createOrderFromCart } from '@/lib/order'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, deliveryType } = body as { userId: string; deliveryType: DeliveryType }

    if (!userId || !deliveryType) {
      return NextResponse.json({ error: 'userId and deliveryType are required' }, { status: 400 })
    }

    const order = await createOrderFromCart(userId, deliveryType)
    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const orders = await db.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(orders)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
