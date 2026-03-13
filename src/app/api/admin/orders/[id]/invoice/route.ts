import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { getInvoice } from '@/lib/documents/invoice'

interface Params {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)
    const buffer = await getInvoice(params.id)
    const short = params.id.slice(0, 8).toUpperCase()
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${short}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
