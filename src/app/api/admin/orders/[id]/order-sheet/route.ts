import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { generateOrderSheet } from '@/lib/documents/orderSheet'

interface Params {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)

    const baseUrl = req.nextUrl.origin
    const buffer = await generateOrderSheet(params.id, baseUrl)
    const short = params.id.slice(0, 8).toUpperCase()

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="order-sheet-${short}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
