import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        shippingMethod: true,
        items: {
          include: {
            uploadFiles: true,
            productionJob: true,
          },
        },
      },
    })
    assertExists(order, 'Order not found')
    return NextResponse.json(order)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
