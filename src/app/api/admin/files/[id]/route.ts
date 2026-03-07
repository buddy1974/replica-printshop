import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAbsPath } from '@/lib/storage'
import { AppError, NotFoundError } from '@/lib/errors'
import fs from 'fs'
import path from 'path'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const upload = await db.uploadFile.findUnique({ where: { id: params.id } })
    if (!upload || !upload.filePath) {
      throw new NotFoundError('File not found')
    }

    const absPath = getAbsPath(upload.filePath)
    if (!fs.existsSync(absPath)) {
      throw new NotFoundError('File not found on disk')
    }

    const buffer = fs.readFileSync(absPath)
    const mime = upload.mime ?? 'application/octet-stream'
    const filename = path.basename(upload.filename)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
