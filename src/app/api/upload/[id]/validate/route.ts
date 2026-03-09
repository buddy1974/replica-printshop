import { NextRequest, NextResponse } from 'next/server'
import { validateUpload } from '@/lib/validation'
import { AppError } from '@/lib/errors'
import { logInfo } from '@/lib/logger'
import { logAction, logError } from '@/lib/log'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const result = await validateUpload(params.id)
    const cookieUserId = req.cookies.get('replica_uid')?.value ?? null
    logInfo('Upload validated', { uploadId: params.id, status: result.status })
    // Step 333
    const action = result.status === 'APPROVED' ? 'UPLOAD_VALIDATE' : 'UPLOAD_REJECT'
    logAction(action, 'upload', {
      userId: cookieUserId,
      entityId: params.id,
      data: { status: result.status, dpi: result.dpi, message: result.message },
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: `/api/upload/${params.id}/validate` })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
