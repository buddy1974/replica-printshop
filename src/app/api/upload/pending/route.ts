import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { savePendingFile, readImageDimensions } from '@/lib/storage'

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf', 'svg'])
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'application/pdf', 'image/svg+xml'])

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(getClientKey(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
    }

    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const widthCm = form.get('widthCm') ? Number(form.get('widthCm')) : null
    const heightCm = form.get('heightCm') ? Number(form.get('heightCm')) : null
    const productId = form.get('productId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIMES.has(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Accepted: PDF, PNG, JPG, JPEG, SVG.' },
        { status: 400 },
      )
    }

    // Use a random ID for the pending upload directory
    const tempId = crypto.randomUUID().replace(/-/g, '')

    const { storagePath, size, mime, buffer } = await savePendingFile(file, tempId)

    // Read pixel dimensions for raster images
    const dims = readImageDimensions(buffer, mime)
    const widthPx = dims?.widthPx ?? null
    const heightPx = dims?.heightPx ?? null

    // Calculate DPI if we have dimensions and a print size
    let dpi: number | null = null
    if (dims && widthCm && heightCm && widthCm > 0 && heightCm > 0) {
      const dpiW = (dims.widthPx * 2.54) / widthCm
      const dpiH = (dims.heightPx * 2.54) / heightCm
      dpi = Math.round(Math.min(dpiW, dpiH))
    }

    // Fetch product minDpi if productId provided
    let minDpi: number | null = null
    if (productId) {
      const product = await db.product.findUnique({ where: { id: productId }, select: { minDpi: true } })
      minDpi = product?.minDpi ?? null
    }

    const validStatus = getValidStatus(dpi, minDpi, dims !== null)

    const userId = req.cookies.get('replica_uid')?.value ?? null

    const pending = await db.pendingUpload.create({
      data: {
        id: tempId,
        userId,
        filename: file.name,
        filePath: storagePath,
        size,
        mime,
        dpi,
        widthPx,
        heightPx,
        validStatus,
      },
    })

    return NextResponse.json({
      id: pending.id,
      filename: pending.filename,
      size: pending.size,
      mime: pending.mime,
      dpi: pending.dpi,
      widthPx: pending.widthPx,
      heightPx: pending.heightPx,
      validStatus: pending.validStatus,
    }, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function getValidStatus(dpi: number | null, minDpi: number | null, isDimensioned: boolean): string {
  // PDF / SVG — can't check DPI
  if (!isDimensioned) return 'PENDING'
  if (dpi === null) return 'PENDING'
  const required = minDpi ?? 100
  if (dpi >= required) return 'OK'
  if (dpi >= 72) return 'WARNING'
  return 'INVALID'
}

