import { NextRequest, NextResponse } from 'next/server'

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
        { error: `File type not supported. Allowed: PDF, PNG, JPG, SVG, AI, PSD` },
        { status: 400 },
      )
    }

    const isImage = IMAGE_TYPES.includes(type)
    let base64: string | undefined

    if (isImage) {
      const buffer = await file.arrayBuffer()
      base64 = Buffer.from(buffer).toString('base64')
    }

    return NextResponse.json({ name, type, size: file.size, isImage, base64 })
  } catch (e) {
    console.error('[chat/upload]', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
