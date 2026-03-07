import { NextRequest, NextResponse } from 'next/server'
import { createPreview } from '@/lib/mockup'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderItemId, filename } = body

    if (!orderItemId) {
      return NextResponse.json({ error: 'orderItemId is required' }, { status: 400 })
    }

    // Find the upload record to get the stored file path
    const upload = await db.uploadFile.findFirst({
      where: { orderItemId, ...(filename ? { filename } : {}) },
      orderBy: { id: 'desc' },
    })

    // Use filePath from DB, fall back to filename as a relative path hint
    const uploadPath = upload?.filePath ?? filename ?? ''

    const previewUrl = await createPreview(orderItemId, uploadPath)
    return NextResponse.json({ previewUrl })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
