// Step 352 — Save editor design: canvas JSON + optional preview PNG

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'
import { saveDesignPreview } from '@/lib/designStorage'
import { logAction, logError } from '@/lib/log'
import { isValidId, MAX_DESIGN_JSON_BYTES, MAX_PREVIEW_BYTES } from '@/lib/inputValidation'

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('replica_uid')?.value ?? null
    const body = await req.json()
    const { productId, data, previewDataUrl } = body
    console.log('DESIGN SAVE BODY', { productId, userId, hasData: !!data, hasPreview: !!previewDataUrl })

    if (!productId || !isValidId(productId)) throw new ValidationError('productId is required')
    if (!data || typeof data !== 'object') throw new ValidationError('data is required')

    // Size guards — prevent storing oversized payloads
    const dataJson = JSON.stringify(data)
    if (dataJson.length > MAX_DESIGN_JSON_BYTES) {
      throw new ValidationError('Design data exceeds 2 MB limit')
    }
    if (previewDataUrl && typeof previewDataUrl === 'string' && previewDataUrl.length > MAX_PREVIEW_BYTES) {
      throw new ValidationError('Preview image exceeds 2 MB limit')
    }

    // Create record first to get the id
    const design = await db.design.create({
      data: {
        userId,
        productId,
        data,
        preview: null,
      },
    })

    // Step 354 — save preview PNG if provided
    let previewPath: string | null = null
    if (previewDataUrl && typeof previewDataUrl === 'string') {
      previewPath = saveDesignPreview(design.id, previewDataUrl)
      if (previewPath) {
        await db.design.update({
          where: { id: design.id },
          data: { preview: previewPath },
        })
      }
    }

    logAction('DESIGN_SAVE', 'design', { userId, entityId: design.id, data: { productId } })

    return NextResponse.json({ id: design.id, preview: previewPath }, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/design/save' })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
