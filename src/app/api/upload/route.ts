import { NextRequest, NextResponse } from 'next/server'
import { replaceOrCreateUpload } from '@/lib/upload'
import { saveFile } from '@/lib/storage'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf', 'svg', 'eps'])
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
  'image/svg+xml',
  'application/postscript',
  'application/eps',
  'application/x-eps',
])

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(getClientIp(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
    }

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

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large. Maximum size is 50 MB.' }, { status: 400 })
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIMES.has(file.type)) {
        return NextResponse.json(
          { error: 'File type not allowed. Accepted: PNG, JPG, PDF, SVG, EPS.' },
          { status: 400 }
        )
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
