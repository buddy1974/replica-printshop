import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { OrderStatus } from '@/generated/prisma/client'

// Statuses relevant to production workflow (excludes PENDING, CANCELLED)
const PRODUCTION_STATUSES: OrderStatus[] = ['CONFIRMED', 'UPLOADED', 'APPROVED', 'READY', 'IN_PRODUCTION', 'DONE']

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const includeDone = req.nextUrl.searchParams.get('done') === '1'
    const statuses = includeDone ? PRODUCTION_STATUSES : PRODUCTION_STATUSES.filter((s) => s !== 'DONE')

    const orders = await db.order.findMany({
      where: { status: { in: statuses } },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        deliveryType: true,
        total: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
        items: {
          select: {
            id: true,
            productName: true,
            variantName: true,
            width: true,
            height: true,
            quantity: true,
            designId: true,
            uploadFiles: {
              where: { NOT: { uploadType: 'PREVIEW' } },
              select: { id: true, filename: true, mime: true, dpi: true, status: true, filePath: true },
              take: 1,
              orderBy: { uploadType: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // FIFO — oldest orders first
    })

    return NextResponse.json(orders)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
