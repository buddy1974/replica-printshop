// Lightweight metadata-only route — file goes directly to Vercel Blob,
// only JSON metadata (blobUrl, dimensions, product info) is posted here.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { analyzeUpload, calculateScore } from '@/lib/ai/printAssist'

export async function POST(req: NextRequest) {
  console.log('PENDING UPLOAD ROUTE HIT')

  try {
    if (!checkRateLimit(getClientKey(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
    }

    const body = await req.json()
    const { blobUrl, pathname, mime, size, filename, productId, widthCm, heightCm, widthPx, heightPx } = body

    console.log('PENDING BODY', { filename, mime, size, widthPx, heightPx, productId, widthCm, heightCm })

    if (!blobUrl || typeof blobUrl !== 'string') {
      return NextResponse.json({ error: 'blobUrl is required' }, { status: 400 })
    }
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    const wPx: number | null = typeof widthPx === 'number' && widthPx > 0 ? Math.round(widthPx) : null
    const hPx: number | null = typeof heightPx === 'number' && heightPx > 0 ? Math.round(heightPx) : null
    const wCm: number | null = typeof widthCm === 'number' && widthCm > 0 ? widthCm : null
    const hCm: number | null = typeof heightCm === 'number' && heightCm > 0 ? heightCm : null

    // DPI from pixel + cm dimensions
    let dpi: number | null = null
    if (wPx && hPx && wCm && hCm) {
      dpi = Math.round(Math.min((wPx * 2.54) / wCm, (hPx * 2.54) / hCm))
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
        minDpi = p?.minDpi ?? null
        recommendedDpi = p?.recommendedDpi ?? null
        bleedMm = p?.bleedMm ?? null
        safeMarginMm = p?.safeMarginMm ?? null
      } catch (e) {
        console.warn('PRODUCT CONFIG FETCH FAILED (non-fatal)', e instanceof Error ? e.message : e)
      }
    }

    // Validation
    const dims = wPx && hPx ? { widthPx: wPx, heightPx: hPx } : null
    const { validStatus, validMessages } = getValidationResult(dpi, dims, wCm, hCm, minDpi)
    console.log('VALIDATION', validStatus, validMessages)

    // AI check + preflight score (images only; skip for PDF where dims are null)
    let aiCheck = null
    let preflightScore: number | null = null
    if (dims) {
      const check = analyzeUpload({
        widthPx: wPx,
        heightPx: hPx,
        dpi,
        productWidthCm: wCm ?? 0,
        productHeightCm: hCm ?? 0,
        bleedMm,
        safeMarginMm,
        minDpi,
        recommendedDpi,
      })
      aiCheck = check
      preflightScore = calculateScore(check).score
      console.log('AI CHECK', check.overall, 'score', preflightScore)
    }

    const userId = req.cookies.get('replica_uid')?.value ?? null

    console.log('SAVING TO DB...')
    let pending
    try {
      pending = await db.pendingUpload.create({
        data: {
          userId,
          filename,
          filePath: null,
          blobUrl,
          pathname: typeof pathname === 'string' ? pathname : null,
          size: typeof size === 'number' ? size : null,
          mime: typeof mime === 'string' ? mime : null,
          dpi,
          widthPx: wPx,
          heightPx: hPx,
          validStatus,
          aiCheck: aiCheck ? (aiCheck as object) : undefined,
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
      blobUrl:       pending.blobUrl,
    }, { status: 201 })

  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('PENDING UPLOAD UNEXPECTED ERROR', e instanceof Error ? e.message : e)
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
