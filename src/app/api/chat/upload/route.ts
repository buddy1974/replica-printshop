import { NextRequest, NextResponse } from 'next/server'
import { validateImage, validatePdf } from '@/lib/fileValidation'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ai', '.psd']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large — maximum 5 MB' }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    const name = file.name ?? 'unknown'
    const ext = '.' + name.split('.').pop()?.toLowerCase()
    const type = file.type || 'application/octet-stream'
    const isAllowed = ALLOWED_EXTENSIONS.includes(ext) || IMAGE_TYPES.includes(type)

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'File type not supported. Allowed: PDF, PNG, JPG, WebP, GIF, SVG, AI, PSD' },
        { status: 400 },
      )
    }

    // Read buffer once — used for both base64 (vision) and validation
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const isImage = IMAGE_TYPES.includes(type)
    const isPDF = type === 'application/pdf' || ext === '.pdf'

    const base64 = isImage ? buffer.toString('base64') : undefined

    // Run validation
    let validation = null
    try {
      if (isImage) {
        validation = await validateImage(buffer, type)
      } else if (isPDF) {
        validation = await validatePdf(buffer)
      }
    } catch (e) {
      console.error('[chat/upload] validation error:', e)
      // Non-fatal — proceed without validation
    }

    return NextResponse.json({ name, type, size: file.size, isImage, base64, validation })
  } catch (e) {
    console.error('[chat/upload]', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
