import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'
import { sendApproved } from '@/lib/email'

interface Params {
  params: { id: string }
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { email: true } },
        items: {
          include: { uploadFiles: { select: { id: true, status: true } } },
        },
      },
    })

    assertExists(order, `Order not found: ${params.id}`)

    if (order.status !== 'UPLOADED') {
      throw new ValidationError(
        `Cannot approve order with status ${order.status}. Order must be UPLOADED.`
      )
    }

    // Safety: every item must have at least one upload, and all uploads must be APPROVED
    for (const item of order.items) {
      if (item.uploadFiles.length === 0) {
        throw new ValidationError(`Order item has no uploaded files.`)
      }
      const allApproved = item.uploadFiles.every((f) => f.status === 'APPROVED')
      if (!allApproved) {
        throw new ValidationError(`All uploaded files must be approved before production.`)
      }
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: params.id },
        data: { status: 'APPROVED' },
      })

      for (const item of order.items) {
        await tx.productionJob.create({
          data: { orderItemId: item.id, status: 'QUEUED' },
        })
      }

      await tx.order.update({
        where: { id: params.id },
        data: { status: 'READY' },
      })
    })

    // Fire email (non-blocking)
    sendApproved(params.id, order.user.email).catch(() => {})

    const updated = await db.order.findUnique({ where: { id: params.id } })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
