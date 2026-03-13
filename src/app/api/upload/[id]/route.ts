import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'
import { FileStatus } from '@/generated/prisma/client'
import { sendFileFixRequest } from '@/lib/email'
import { assertExists } from '@/lib/assert'

interface Params {
  params: { id: string }
}

const VALID_STATUSES: FileStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_FIX']

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json() as { status: string; adminMessage?: string }
    const { status, adminMessage } = body

    if (!VALID_STATUSES.includes(status as FileStatus)) {
      throw new ValidationError(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    const existing = await db.uploadFile.findUnique({ where: { id: params.id } })
    assertExists(existing, 'Upload not found')

    // Update status + optional admin message
    const upload = await db.uploadFile.update({
      where: { id: params.id },
      data: {
        status: status as FileStatus,
        adminMessage: adminMessage !== undefined ? (adminMessage || null) : undefined,
      },
    })

    // Send email to customer for REJECTED or NEEDS_FIX
    if (status === 'REJECTED' || status === 'NEEDS_FIX') {
      const full = await db.uploadFile.findUnique({
        where: { id: params.id },
        include: {
          orderItem: {
            include: { order: { include: { user: { select: { email: true } } } } },
          },
        },
      })
      const email = full?.orderItem.order.user?.email
      if (email && full) {
        sendFileFixRequest(
          full.orderItem.order.id,
          full.orderItem.id,
          email,
          upload.filename,
          status as 'REJECTED' | 'NEEDS_FIX',
          adminMessage,
        ).catch(() => {})
      }
    }

    return NextResponse.json(upload)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
