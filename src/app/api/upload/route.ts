import { NextRequest, NextResponse } from 'next/server'
import { replaceOrCreateUpload } from '@/lib/upload'
import { saveFile } from '@/lib/storage'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { logInfo, logError } from '@/lib/logger'

// Step 305 — env-configurable size limit
const MAX_FILE_SIZE = process.env.MAX_UPLOAD_SIZE
  ? parseInt(process.env.MAX_UPLOAD_SIZE, 10)
  : 100 * 1024 * 1024
const MAX_FILE_SIZE_MB = Math.round(MAX_FILE_SIZE / 1024 / 1024)

// Steps 306 — allowed types: pdf, png, jpg, jpeg, svg, tiff
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf', 'svg', 'tif', 'tiff'])
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
  'image/svg+xml',
  'image/tiff',
])

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(getClientKey(req), 10, 60_000)) {
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

      // Step 265 — ownership check
      const cookieUserId = req.cookies.get('replica_uid')?.value ?? ''
      const item = await db.orderItem.findUnique({
        where: { id: orderItemId },
        select: { order: { select: { userId: true, status: true } } },
      })
      if (!item) {
        return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
      }
      const orderOwnerId = item.order.userId
      if (orderOwnerId) {
        if (!cookieUserId) {
          return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        if (cookieUserId !== orderOwnerId) {
          // Allow admin override
          const user = await db.user.findUnique({ where: { id: cookieUserId }, select: { isAdmin: true } })
          if (!user?.isAdmin) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
          }
        }
      }

      // Step 304 — order status must allow uploads
      const UPLOAD_ALLOWED = ['CONFIRMED', 'UPLOADED']
      if (!UPLOAD_ALLOWED.includes(item.order.status)) {
        return NextResponse.json(
          { error: `Uploads are not allowed for orders with status ${item.order.status}.` },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.` }, { status: 400 })
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIMES.has(file.type)) {
        return NextResponse.json(
          { error: 'File type not allowed. Accepted: PDF, PNG, JPG, JPEG, SVG, TIFF.' },
          { status: 400 }
        )
      }

      // Step 274 — safe upload: log on failure, surface readable error
      let saved: { storagePath: string; size: number; mime: string }
      try {
        saved = await saveFile(file, orderItemId)
      } catch (saveErr) {
        logError('File save failed', saveErr, { orderItemId, filename: file.name })
        return NextResponse.json({ error: 'File could not be saved. Please try again.' }, { status: 500 })
      }
      const { storagePath, size, mime } = saved

      const upload = await replaceOrCreateUpload({ orderItemId, filename: file.name, filePath: storagePath, size, mime, uploadType, uploadIndex })
      logInfo('Upload created', { orderItemId, filename: file.name, size }) // step 279
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
