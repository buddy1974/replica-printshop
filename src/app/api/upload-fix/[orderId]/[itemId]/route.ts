import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { db } from '@/lib/db'
import { AppError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { saveFile, getAbsPath, readImageDimensions } from '@/lib/storage'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'

interface Params {
  params: { orderId: string; itemId: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    if (!checkRateLimit(getClientKey(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
    }

    // Verify customer owns this order
    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) throw new UnauthorizedError('Not logged in')

    const order = await db.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, userId: true },
    })
    if (!order) throw new NotFoundError('Order not found')
    if (order.userId !== userId) throw new UnauthorizedError('Access denied')

    // Find the upload file to replace (REJECTED or NEEDS_FIX, for this item)
    const uploadFile = await db.uploadFile.findFirst({
      where: {
        orderItemId: params.itemId,
        status: { in: ['REJECTED', 'NEEDS_FIX', 'PENDING'] },
        NOT: { uploadType: 'PREVIEW' },
      },
      orderBy: { uploadIndex: 'asc' },
    })
    if (!uploadFile) throw new NotFoundError('No file to replace for this item')

    const contentType = req.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      throw new ValidationError('multipart/form-data required')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) throw new ValidationError('No file provided')

    // Save new file
    const { storagePath, size, mime } = await saveFile(file, params.itemId)

    // Read image dimensions
    let widthPx: number | null = null
    let heightPx: number | null = null
    let dpi: number | null = null
    if (mime === 'image/png' || mime === 'image/jpeg') {
      const absPath = getAbsPath(storagePath)
      if (fs.existsSync(absPath)) {
        const buffer = fs.readFileSync(absPath)
        const dims = readImageDimensions(buffer, mime)
        if (dims) { widthPx = dims.widthPx; heightPx = dims.heightPx }
        // Estimate DPI from item dimensions
        const item = await db.orderItem.findUnique({
          where: { id: params.itemId },
          select: { width: true, height: true },
        })
        if (item && widthPx && heightPx) {
          const wDpi = (widthPx * 2.54) / Number(item.width)
          const hDpi = (heightPx * 2.54) / Number(item.height)
          dpi = Math.round(Math.min(wDpi, hDpi))
        }
      }
    }

    // Delete old file from disk
    if (uploadFile.filePath) {
      try {
        const { deleteFile } = await import('@/lib/storage')
        deleteFile(uploadFile.filePath)
      } catch { /* ignore */ }
    }

    // Replace UploadFile record — reset status to PENDING, clear adminMessage
    const updated = await db.uploadFile.update({
      where: { id: uploadFile.id },
      data: {
        filename: file.name,
        filePath: storagePath,
        size,
        mime,
        dpi,
        widthPx,
        heightPx,
        status: 'PENDING',
        adminMessage: null,
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
