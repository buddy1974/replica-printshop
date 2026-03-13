import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { AppError, NotFoundError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { saveFile, deleteFile, getAbsPath, readImageDimensions } from '@/lib/storage'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const existing = await db.uploadFile.findUnique({ where: { id: params.id } })
    if (!existing) throw new NotFoundError('File not found')

    // Save new file to storage in same order-item directory
    const { storagePath, size, mime } = await saveFile(file, existing.orderItemId)

    // Read dimensions if image
    const dpi: number | null = null
    let widthPx: number | null = null
    let heightPx: number | null = null
    if (mime === 'image/png' || mime === 'image/jpeg') {
      const absPath = getAbsPath(storagePath)
      if (fs.existsSync(absPath)) {
        const buffer = fs.readFileSync(absPath)
        const dims = readImageDimensions(buffer, mime)
        if (dims) { widthPx = dims.widthPx; heightPx = dims.heightPx }
      }
    }

    // Delete old file from disk
    if (existing.filePath) {
      try { deleteFile(existing.filePath) } catch { /* ignore if already gone */ }
    }

    // Update UploadFile record — reset to PENDING for re-review
    const updated = await db.uploadFile.update({
      where: { id: params.id },
      data: {
        filename: path.basename(file.name),
        filePath: storagePath,
        size,
        mime,
        dpi,
        widthPx,
        heightPx,
        status: 'PENDING',
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
