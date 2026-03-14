export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']
const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  if (!checkRateLimit(getClientKey(req), 10, 60_000)) {
    return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
  }

  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Metadata saved separately via /api/upload/pending
        console.log('BLOB UPLOAD COMPLETED', blob.url)
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('BLOB TOKEN ERROR', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Upload token error. Please try again.' }, { status: 400 })
  }
}
