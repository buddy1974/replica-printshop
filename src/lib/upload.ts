import { db } from '@/lib/db'
import { FileStatus } from '@/generated/prisma/client'
import { assert, assertExists } from '@/lib/assert'

export interface CreateUploadInput {
  orderItemId: string
  filename: string
  filePath?: string
  size?: number
  mime?: string
  dpi?: number
  widthPx?: number
  heightPx?: number
  status?: FileStatus
}

export async function createUpload(input: CreateUploadInput) {
  const { orderItemId, filename, filePath, size, mime, dpi, widthPx, heightPx, status = 'PENDING' } = input

  assert(filename.length > 0, 'filename must not be empty')

  const orderItem = await db.orderItem.findUnique({ where: { id: orderItemId }, select: { id: true } })
  assertExists(orderItem, `OrderItem not found: ${orderItemId}`)

  return db.uploadFile.create({
    data: {
      orderItemId,
      filename,
      filePath: filePath ?? null,
      size: size ?? null,
      mime: mime ?? null,
      dpi: dpi ?? null,
      widthPx: widthPx ?? null,
      heightPx: heightPx ?? null,
      status,
    },
  })
}

export async function getUploadsForOrderItem(orderItemId: string) {
  return db.uploadFile.findMany({
    where: { orderItemId },
  })
}

export async function attachUploadToOrderItem(uploadId: string, orderItemId: string) {
  return db.uploadFile.update({
    where: { id: uploadId },
    data: { orderItemId },
  })
}

export async function updateUploadStatus(uploadId: string, status: FileStatus) {
  const upload = await db.uploadFile.findUnique({ where: { id: uploadId }, select: { id: true } })
  assertExists(upload, `Upload not found: ${uploadId}`)

  return db.uploadFile.update({
    where: { id: uploadId },
    data: { status },
  })
}
