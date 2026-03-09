import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'
import { sendApproved } from '@/lib/email'
import { createProductionJob } from '@/lib/production'
import { requireAdmin } from '@/lib/adminAuth'
import { logInfo } from '@/lib/logger'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { email: true } },
        items: {
          include: { uploadFiles: { select: { id: true, status: true, uploadType: true } } },
        },
      },
    })

    assertExists(order, `Order not found: ${params.id}`)

    // Step 276 — Idempotent approve: safe to call multiple times
    const ALREADY_APPROVED = ['APPROVED', 'READY', 'IN_PRODUCTION', 'DONE']
    if (ALREADY_APPROVED.includes(order.status)) {
      return NextResponse.json({ message: `Order is already ${order.status}`, id: params.id })
    }

    if (order.status !== 'UPLOADED') {
      throw new ValidationError(
        `Cannot approve order with status ${order.status}. Order must be UPLOADED.`
      )
    }

    // Safety: every item must have at least one non-preview upload, and all non-preview uploads must be APPROVED
    for (const item of order.items) {
      const artFiles = item.uploadFiles.filter((f) => f.uploadType !== 'PREVIEW')
      if (artFiles.length === 0) {
        throw new ValidationError(`Order item "${item.id}" has no uploaded artwork files.`)
      }
      const allApproved = artFiles.every((f) => f.status === 'APPROVED')
      if (!allApproved) {
        throw new ValidationError(`All artwork files must be approved before production.`)
      }
    }

    await db.order.update({ where: { id: params.id }, data: { status: 'APPROVED' } })

    for (const item of order.items) {
      await createProductionJob(item.id)
    }

    await db.order.update({ where: { id: params.id }, data: { status: 'READY' } })

    logInfo('Order approved', { orderId: params.id }) // step 279

    // Fire email (non-blocking)
    if (order.user?.email) sendApproved(params.id, order.user.email).catch(() => {})

    const updated = await db.order.findUnique({ where: { id: params.id } })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
