import { NextRequest, NextResponse } from 'next/server'
import { updateUploadStatus } from '@/lib/upload'
import { AppError, ValidationError } from '@/lib/errors'
import { FileStatus } from '@/generated/prisma/client'

interface Params {
  params: { id: string }
}

const VALID_STATUSES: FileStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { status } = await req.json()
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    const upload = await updateUploadStatus(params.id, status)
    return NextResponse.json(upload)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
