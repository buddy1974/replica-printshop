import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { addToCart } from '@/lib/cart'
import { AppError, NotFoundError, UnauthorizedError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) throw new UnauthorizedError('Not logged in')

    const body = await req.json()
    const { orderId } = body as { orderId?: string }
    if (!orderId) throw new UnauthorizedError('orderId required')

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            uploadFiles: {
              where: { NOT: { uploadType: 'PREVIEW' } },
              orderBy: { uploadIndex: 'asc' },
            },
          },
        },
      },
    })
    if (!order) throw new NotFoundError('Order not found')
    if (order.userId !== userId) throw new UnauthorizedError('Access denied')

    let addedCount = 0

    for (const item of order.items) {
      if (!item.productId) continue

      // If this item had uploaded files, clone the first one as a new PendingUpload
      let pendingUploadId: string | undefined
      if (item.uploadFiles.length > 0) {
        const src = item.uploadFiles[0]
        const pu = await db.pendingUpload.create({
          data: {
            userId,
            filename: src.filename,
            filePath: src.filePath ?? null,
            size: src.size ?? null,
            mime: src.mime ?? null,
            dpi: src.dpi ?? null,
            widthPx: src.widthPx ?? null,
            heightPx: src.heightPx ?? null,
            validStatus: 'VALID',
          },
        })
        pendingUploadId = pu.id
      }

      await addToCart({
        userId,
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        designId: item.designId ?? undefined,
        pendingUploadId,
        width: Number(item.width),
        height: Number(item.height),
        quantity: item.quantity,
      })
      addedCount++
    }

    return NextResponse.json({ addedCount })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
