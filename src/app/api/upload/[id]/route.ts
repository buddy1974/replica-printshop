import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updateUploadStatus } from '@/lib/upload'
import { AppError, ValidationError } from '@/lib/errors'
import { FileStatus } from '@/generated/prisma/client'
import { sendRejected } from '@/lib/email'

interface Params {
  params: { id: string }
}

const VALID_STATUSES: FileStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_FIX']

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { status } = await req.json()
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    const upload = await updateUploadStatus(params.id, status)

    // Fire rejection email (non-blocking)
    if (status === 'REJECTED') {
      const full = await db.uploadFile.findUnique({
        where: { id: params.id },
        include: {
          orderItem: {
            include: { order: { include: { user: { select: { email: true } } } } },
          },
        },
      })
      const email = full?.orderItem.order.user?.email
      if (email) {
        sendRejected(full.orderItem.order.id, email, upload.filename).catch(() => {})
      }
    }

    return NextResponse.json(upload)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
