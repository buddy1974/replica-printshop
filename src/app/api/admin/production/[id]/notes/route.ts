import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { assertExists } from '@/lib/assert'

interface Params { params: { id: string } }

// PATCH /api/admin/production/[id]/notes
// Body: { notes: string }
// Upserts ProductionJob.notes for all items in the order.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)

    const body = await req.json() as { notes?: string }
    if (typeof body.notes !== 'string') {
      throw new ValidationError('notes must be a string')
    }
    const notes = body.notes.slice(0, 2000) // max length

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: { select: { id: true } } },
    })
    assertExists(order, 'Order not found')

    await Promise.all(
      order.items.map((item) =>
        db.productionJob.upsert({
          where: { orderItemId: item.id },
          update: { notes },
          create: { orderItemId: item.id, notes },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
