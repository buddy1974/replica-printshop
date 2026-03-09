import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'
import { requireOwner } from '@/lib/requireOwner'

interface Params {
  params: { id: string }
}

// Step 321 — customer ownership check
export async function GET(req: NextRequest, { params }: Params) {
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
    await requireOwner(req, order.userId)
    return NextResponse.json(order)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
