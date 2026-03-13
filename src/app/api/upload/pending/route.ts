import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { savePendingFile, readImageDimensions } from '@/lib/storage'
import { analyzeUpload } from '@/lib/ai/printAssist'

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

    // Fetch product config (minDpi + dimensions for AI check)
    let minDpi: number | null = null
    let recommendedDpi: number | null = null
    let bleedMm: number | null = null
    let safeMarginMm: number | null = null
    if (productId) {
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { minDpi: true, recommendedDpi: true, bleedMm: true, safeMarginMm: true },
      })
      minDpi       = product?.minDpi       ?? null
      recommendedDpi = product?.recommendedDpi ?? null
      bleedMm      = product?.bleedMm      ?? null
      safeMarginMm = product?.safeMarginMm ?? null
    }

    const { validStatus, validMessages } = getValidationResult(dpi, dims, widthCm, heightCm, minDpi)

    // AI print check
    const aiCheck = analyzeUpload({
      widthPx,
      heightPx,
      dpi,
      productWidthCm:  widthCm  ?? 0,
      productHeightCm: heightCm ?? 0,
      bleedMm,
      safeMarginMm,
      minDpi,
      recommendedDpi,
    })

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
        aiCheck: aiCheck as object,
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
      validMessages,
      aiCheck,
    }, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function getValidationResult(
  dpi: number | null,
  dims: { widthPx: number; heightPx: number } | null,
  widthCm: number | null,
  heightCm: number | null,
  minDpi: number | null,
): { validStatus: string; validMessages: string[] } {
  const messages: string[] = []

  // PDF / SVG — format accepted, dimensions not available
  if (!dims) {
    messages.push('PDF/SVG — resolution not checked automatically.')
    return { validStatus: 'PENDING', validMessages: messages }
  }

  // DPI check — spec: ≥150 OK, 72–149 WARNING, <72 INVALID
  const required = minDpi ?? 150
  let validStatus = 'OK'

  if (dpi === null) {
    messages.push('Could not determine resolution.')
    validStatus = 'PENDING'
  } else if (dpi >= required) {
    messages.push(`Resolution: ${dpi} DPI ✓`)
  } else if (dpi >= 72) {
    messages.push(`Resolution: ${dpi} DPI — recommended ${required}+ DPI. Print may appear blurry.`)
    validStatus = 'WARNING'
  } else {
    messages.push(`Resolution: ${dpi} DPI — too low (minimum ${required} DPI). Print quality will be poor.`)
    validStatus = 'INVALID'
  }

  // Size / aspect ratio check — warn if orientation or proportions differ by >20%
  if (widthCm && heightCm && widthCm > 0 && heightCm > 0) {
    const fileRatio  = dims.widthPx  / dims.heightPx
    const printRatio = widthCm / heightCm
    const diff = Math.abs(fileRatio - printRatio) / printRatio

    if (diff > 0.20) {
      const filePort  = dims.widthPx < dims.heightPx
      const printPort = widthCm < heightCm
      if (filePort !== printPort) {
        messages.push(
          `Orientation mismatch: file is ${filePort ? 'portrait' : 'landscape'}, print size is ${printPort ? 'portrait' : 'landscape'}.`
        )
      } else {
        const fileRatioStr  = `${dims.widthPx}×${dims.heightPx}px`
        const printRatioStr = `${widthCm}×${heightCm}cm`
        messages.push(`Proportions differ (${fileRatioStr} vs ${printRatioStr}) — image may be stretched or cropped.`)
      }
      if (validStatus === 'OK') validStatus = 'WARNING'
    }
  }

  return { validStatus, validMessages: messages }
}

