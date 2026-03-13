import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, NotFoundError, UnauthorizedError } from '@/lib/errors'
import { getInvoice } from '@/lib/documents/invoice'

interface Params {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) throw new UnauthorizedError('Not logged in')

    const order = await db.order.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, paymentStatus: true },
    })
    if (!order) throw new NotFoundError('Order not found')
    if (order.userId !== userId) throw new UnauthorizedError('Access denied')
    if (order.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: 'Invoice only available for paid orders' }, { status: 403 })
    }

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
