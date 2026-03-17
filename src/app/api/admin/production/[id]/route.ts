import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { assertExists } from '@/lib/assert'

interface Params { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { email: true, name: true } },
        shippingMethod: { select: { name: true } },
        items: {
          include: {
            uploadFiles: {
              orderBy: [{ uploadType: 'asc' }, { uploadIndex: 'asc' }],
            },
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
