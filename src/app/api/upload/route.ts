import { NextRequest, NextResponse } from 'next/server'
import { replaceOrCreateUpload } from '@/lib/upload'
import { saveFile } from '@/lib/storage'
import { AppError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const orderItemId = form.get('orderItemId') as string | null
      const file = form.get('file') as File | null
      const uploadType = (form.get('uploadType') as string | null) || undefined
      const uploadIndex = form.get('uploadIndex') ? Number(form.get('uploadIndex')) : undefined

      if (!orderItemId || !file) {
        return NextResponse.json({ error: 'orderItemId and file are required' }, { status: 400 })
      }

      const { storagePath, size, mime } = await saveFile(file, orderItemId)

      const upload = await replaceOrCreateUpload({ orderItemId, filename: file.name, filePath: storagePath, size, mime, uploadType, uploadIndex })
      return NextResponse.json(upload, { status: 201 })
    }

    // JSON fallback (no actual file stored)
    const body = await req.json()
    const { orderItemId, filename, dpi, widthPx, heightPx, uploadType, uploadIndex } = body

    if (!orderItemId || !filename) {
      return NextResponse.json({ error: 'orderItemId and filename are required' }, { status: 400 })
    }

    const upload = await replaceOrCreateUpload({ orderItemId, filename, dpi, widthPx, heightPx, uploadType, uploadIndex })
    return NextResponse.json(upload, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
