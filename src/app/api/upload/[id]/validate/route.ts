import { NextRequest, NextResponse } from 'next/server'
import { validateUpload } from '@/lib/validation'
import { AppError } from '@/lib/errors'
import { logInfo } from '@/lib/logger'

interface Params {
  params: { id: string }
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const result = await validateUpload(params.id)
    logInfo('Upload validated', { uploadId: params.id }) // step 279
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
