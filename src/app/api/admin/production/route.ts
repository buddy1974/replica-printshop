import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { OrderStatus } from '@/generated/prisma/client'

// Statuses relevant to production workflow (excludes PENDING, SHIPPED, DELIVERED, CANCELLED)
const PRODUCTION_STATUSES: OrderStatus[] = ['CONFIRMED', 'UPLOADED', 'APPROVED', 'READY', 'IN_PRODUCTION', 'DONE']

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    // ?done=1 still accepted for backwards-compat but DONE is always included now
    void req.nextUrl.searchParams.get('done')
    const statuses = PRODUCTION_STATUSES

    const orders = await db.order.findMany({
      where: { status: { in: statuses } },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        deliveryType: true,
        total: true,
        createdAt: true,
        shippingName: true,
        shippingCity: true,
        shippingCountry: true,
        user: { select: { email: true, name: true } },
        items: {
          select: {
            id: true,
            productName: true,
            variantName: true,
            categoryName: true,
            productionTypeSnapshot: true,
            width: true,
            height: true,
            quantity: true,
            designId: true,
            uploadFiles: {
              where: { NOT: { uploadType: 'PREVIEW' } },
              select: { id: true, filename: true, mime: true, dpi: true, status: true, filePath: true },
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
