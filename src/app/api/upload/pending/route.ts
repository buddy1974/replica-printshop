// Force Node.js runtime — required for Buffer + file uploads on Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { readImageDimensions } from '@/lib/storage'
import { analyzeUpload, calculateScore } from '@/lib/ai/printAssist'

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf'])
const ALLOWED_MIMES      = new Set(['image/png', 'image/jpeg', 'application/pdf'])

export async function POST(req: NextRequest) {
  console.log('UPLOAD ROUTE HIT')

  try {
    // Rate limit
    if (!checkRateLimit(getClientKey(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
    }

    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })
    }

    // Parse form
    const form      = await req.formData()
    const file      = form.get('file') as File | null
    const widthCm   = form.get('widthCm')  ? Number(form.get('widthCm'))  : null
    const heightCm  = form.get('heightCm') ? Number(form.get('heightCm')) : null
    const productId = form.get('productId') as string | null

    console.log('FILE RECEIVED', file?.name, file?.size, file?.type)
    console.log('PRODUCT', productId, 'SIZE', widthCm, 'x', heightCm)

    if (!file) {
      return NextResponse.json({ error: 'No file received. Please select a file and try again.' }, { status: 400 })
    }

    // Validate type
    const ext    = file.name.split('.').pop()?.toLowerCase() ?? ''
    const typeOk = ALLOWED_MIMES.has(file.type) || ALLOWED_EXTENSIONS.has(ext)
    if (!typeOk) {
      console.log('FILE TYPE REJECTED', file.type, ext)
      return NextResponse.json(
        { error: `File type not supported. Please upload PDF, PNG, or JPG. (Got: ${file.type || `.${ext}`})` },
        { status: 400 },
      )
    }
    console.log('FILE TYPE OK', file.type, ext)

    // Read buffer (no disk write on Vercel)
    const buffer = Buffer.from(await file.arrayBuffer())
    const mime   = file.type || 'application/octet-stream'
    const size   = buffer.length
    console.log('BUFFER READ', size, 'bytes')

    // Dimensions (PNG/JPG only — null for PDF)
    const dims     = readImageDimensions(buffer, mime)
    const widthPx  = dims?.widthPx  ?? null
    const heightPx = dims?.heightPx ?? null
    console.log('DIMS', dims ? `${widthPx}x${heightPx}` : 'not available (PDF/SVG)')

    // DPI
    let dpi: number | null = null
    if (dims && widthCm && heightCm && widthCm > 0 && heightCm > 0) {
      dpi = Math.round(Math.min(
        (dims.widthPx  * 2.54) / widthCm,
        (dims.heightPx * 2.54) / heightCm,
      ))
    }
    console.log('DPI', dpi)

    // Product config (non-fatal)
    let minDpi: number | null = null, recommendedDpi: number | null = null
    let bleedMm: number | null = null, safeMarginMm: number | null = null
    if (productId) {
      try {
        const p = await db.product.findUnique({
          where: { id: productId },
          select: { minDpi: true, recommendedDpi: true, bleedMm: true, safeMarginMm: true },
        })
        minDpi = p?.minDpi ?? null; recommendedDpi = p?.recommendedDpi ?? null
        bleedMm = p?.bleedMm ?? null; safeMarginMm = p?.safeMarginMm ?? null
      } catch (e) {
        console.warn('PRODUCT CONFIG FETCH FAILED (non-fatal)', e instanceof Error ? e.message : e)
      }
    }

    // Validation result
    const { validStatus, validMessages } = getValidationResult(dpi, dims, widthCm, heightCm, minDpi)
    console.log('VALIDATION', validStatus, validMessages)

    // AI check + preflight score
    const aiCheck      = analyzeUpload({ widthPx, heightPx, dpi, productWidthCm: widthCm ?? 0, productHeightCm: heightCm ?? 0, bleedMm, safeMarginMm, minDpi, recommendedDpi })
    const preflightScore = calculateScore(aiCheck).score
    console.log('AI CHECK', aiCheck.overall, 'score', preflightScore)

    const tempId = crypto.randomUUID().replace(/-/g, '')
    const userId = req.cookies.get('replica_uid')?.value ?? null

    // DB record
    console.log('SAVING TO DB...')
    let pending
    try {
      pending = await db.pendingUpload.create({
        data: {
          id:            tempId,
          userId,
          filename:      file.name,
          filePath:      null,       // No disk storage on Vercel
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
      console.log('DB RECORD CREATED', pending.id)
    } catch (dbErr) {
      console.error('DB CREATE FAILED', dbErr instanceof Error ? dbErr.message : dbErr)
      return NextResponse.json({ error: 'Upload could not be saved. Please try again.' }, { status: 500 })
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
    console.error('UPLOAD UNEXPECTED ERROR', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
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

  if (!dims) {
    messages.push('PDF uploaded — resolution will be verified by our team.')
    return { validStatus: 'PENDING', validMessages: messages }
  }

  const required  = minDpi ?? 72
  let validStatus = 'OK'

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

  if (widthCm && heightCm && widthCm > 0 && heightCm > 0) {
    const fileRatio  = dims.widthPx  / dims.heightPx
    const printRatio = widthCm / heightCm
    const diff = Math.abs(fileRatio - printRatio) / printRatio
    if (diff > 0.20) {
      const filePort  = dims.widthPx < dims.heightPx
      const printPort = widthCm < heightCm
      if (filePort !== printPort) {
        messages.push(`Orientation mismatch: file is ${filePort ? 'portrait' : 'landscape'}, print size is ${printPort ? 'portrait' : 'landscape'}.`)
      } else {
        messages.push(`Proportions differ (${dims.widthPx}×${dims.heightPx}px vs ${widthCm}×${heightCm}cm) — image may be stretched or cropped.`)
      }
      if (validStatus === 'OK') validStatus = 'WARNING'
    }
  }

  return { validStatus, validMessages: messages }
}
