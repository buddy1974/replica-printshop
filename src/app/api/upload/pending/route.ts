import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { savePendingFile, readImageDimensions } from '@/lib/storage'
import { analyzeUpload, calculateScore } from '@/lib/ai/printAssist'

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf'])
const ALLOWED_MIMES      = new Set(['image/png', 'image/jpeg', 'application/pdf'])

const step = (n: number, msg: string, data?: unknown) =>
  console.log(`[UPLOAD STEP ${n}] ${msg}`, data !== undefined ? JSON.stringify(data) : '')
const fail = (n: number, msg: string, err?: unknown) =>
  console.error(`[UPLOAD ERROR ${n}] ${msg}`, err instanceof Error ? err.message : err)

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit ──────────────────────────────────────────────────────────
    if (!checkRateLimit(getClientKey(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
    }

    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })
    }

    const form      = await req.formData()
    const file      = form.get('file') as File | null
    const widthCm   = form.get('widthCm')  ? Number(form.get('widthCm'))  : null
    const heightCm  = form.get('heightCm') ? Number(form.get('heightCm')) : null
    const productId = form.get('productId') as string | null

    // ── STEP 1: Request received ────────────────────────────────────────────
    step(1, 'Request received', {
      productId,
      widthCm,
      heightCm,
      fileName: file?.name,
      fileSize: file?.size,
      mimeType: file?.type,
    })

    if (!file) {
      return NextResponse.json({ error: 'No file received. Please select a file and try again.' }, { status: 400 })
    }

    // ── STEP 2: Validate file type ──────────────────────────────────────────
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const mimeOk = ALLOWED_MIMES.has(file.type)
    const extOk  = ALLOWED_EXTENSIONS.has(ext)

    if (!mimeOk && !extOk) {
      step(2, 'File type rejected', { ext, type: file.type })
      return NextResponse.json(
        { error: `File type not supported. Please upload PDF, PNG, or JPG. (Received: ${file.type || `.${ext}`})` },
        { status: 400 },
      )
    }
    step(2, 'File type accepted', { ext, type: file.type, size: file.size })

    const tempId = crypto.randomUUID().replace(/-/g, '')

    // ── STEP 3: Save to storage ─────────────────────────────────────────────
    let storagePath: string | null
    let size: number
    let mime: string
    let buffer: Buffer

    try {
      const saved = await savePendingFile(file, tempId)
      storagePath = saved.storagePath
      size        = saved.size
      mime        = saved.mime
      buffer      = saved.buffer
      step(3, 'File saved', { storagePath: storagePath ?? 'memory-only (disk unavailable)', size, mime })
    } catch (err) {
      fail(3, 'savePendingFile failed', err)
      if (err instanceof AppError) throw err
      return NextResponse.json(
        { error: 'Could not process your file. Please check the file is not corrupted and try again.' },
        { status: 400 },
      )
    }

    // ── STEP 4: Extract image dimensions ───────────────────────────────────
    let dims: { widthPx: number; heightPx: number } | null = null
    try {
      dims = readImageDimensions(buffer, mime)
      if (dims) {
        step(4, 'Dimensions extracted', dims)
      } else {
        step(4, 'Dimensions not available (PDF/SVG — expected, not an error)')
      }
    } catch (err) {
      fail(4, 'Dimension extraction error (non-fatal, continuing)', err)
    }

    const widthPx  = dims?.widthPx  ?? null
    const heightPx = dims?.heightPx ?? null

    // ── STEP 5: Calculate DPI ───────────────────────────────────────────────
    let dpi: number | null = null
    if (dims && widthCm && heightCm && widthCm > 0 && heightCm > 0) {
      const dpiW = (dims.widthPx  * 2.54) / widthCm
      const dpiH = (dims.heightPx * 2.54) / heightCm
      dpi = Math.round(Math.min(dpiW, dpiH))
      step(5, 'DPI calculated', { dpi, widthPx: dims.widthPx, heightPx: dims.heightPx, widthCm, heightCm })
    } else {
      step(5, 'DPI not calculated', { hasDims: !!dims, widthCm, heightCm })
    }

    // ── STEP 6: Fetch product config ────────────────────────────────────────
    let minDpi: number | null         = null
    let recommendedDpi: number | null = null
    let bleedMm: number | null        = null
    let safeMarginMm: number | null   = null

    if (productId) {
      try {
        const product = await db.product.findUnique({
          where:  { id: productId },
          select: { minDpi: true, recommendedDpi: true, bleedMm: true, safeMarginMm: true },
        })
        minDpi         = product?.minDpi         ?? null
        recommendedDpi = product?.recommendedDpi ?? null
        bleedMm        = product?.bleedMm        ?? null
        safeMarginMm   = product?.safeMarginMm   ?? null
        step(6, 'Product config loaded', { minDpi, recommendedDpi, bleedMm, safeMarginMm })
      } catch (err) {
        fail(6, 'Product config fetch failed (non-fatal, continuing without specs)', err)
      }
    } else {
      step(6, 'No productId — skipping product spec fetch')
    }

    // ── STEP 7: Validation result ───────────────────────────────────────────
    const { validStatus, validMessages } = getValidationResult(dpi, dims, widthCm, heightCm, minDpi)
    step(7, 'Validation result', { validStatus, validMessages })

    // ── STEP 8: AI print check ──────────────────────────────────────────────
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
    const preflightScore = calculateScore(aiCheck).score
    step(8, 'AI check complete', { overall: aiCheck.overall, preflightScore })

    const userId = req.cookies.get('replica_uid')?.value ?? null

    // ── STEP 9: Save DB record ──────────────────────────────────────────────
    let pending
    try {
      pending = await db.pendingUpload.create({
        data: {
          id: tempId,
          userId,
          filename:      file.name,
          filePath:      storagePath,
          size,
          mime,
          dpi,
          widthPx,
          heightPx,
          validStatus,
          aiCheck:       aiCheck as object,
          preflightScore,
        },
      })
      step(9, 'DB record created', { id: pending.id })
    } catch (err) {
      fail(9, 'DB record creation failed', err)
      return NextResponse.json(
        { error: 'Upload could not be saved to the database. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      id:            pending.id,
      filename:      pending.filename,
      size:          pending.size,
      mime:          pending.mime,
      dpi:           pending.dpi,
      widthPx:       pending.widthPx,
      heightPx:      pending.heightPx,
      validStatus:   pending.validStatus,
      validMessages,
      aiCheck,
      preflightScore,
    }, { status: 201 })

  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    fail(0, 'Unexpected error in upload pipeline', e)
    return NextResponse.json(
      { error: 'An unexpected error occurred during upload. Please try again or contact support.' },
      { status: 500 },
    )
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
    messages.push('PDF uploaded — resolution will be verified by our team.')
    return { validStatus: 'PENDING', validMessages: messages }
  }

  // Default required DPI: use product minDpi, fall back to 72
  const required   = minDpi ?? 72
  let validStatus  = 'OK'

  if (dpi === null) {
    messages.push('Resolution could not be determined — please verify your file meets the size requirements.')
  } else if (dpi >= required) {
    messages.push(`Resolution: ${dpi} DPI ✓`)
  } else if (dpi >= 50) {
    messages.push(`Resolution: ${dpi} DPI — low for this print size (min ${required} DPI). Print may appear soft.`)
    validStatus = 'WARNING'
  } else {
    messages.push(`Resolution: ${dpi} DPI — very low. We recommend at least ${required} DPI for quality results.`)
    validStatus = 'WARNING'
  }

  // Aspect ratio / orientation check — warn if proportions differ by >20%
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
        messages.push(`Proportions differ (${dims.widthPx}×${dims.heightPx}px vs ${widthCm}×${heightCm}cm) — image may be stretched or cropped.`)
      }
      if (validStatus === 'OK') validStatus = 'WARNING'
    }
  }

  return { validStatus, validMessages: messages }
}
