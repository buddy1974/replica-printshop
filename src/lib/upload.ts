import { db } from '@/lib/db'
import { FileStatus } from '@/generated/prisma/client'
import { assert, assertExists } from '@/lib/assert'
import { deleteFile } from '@/lib/storage'

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
  uploadType?: string
  uploadIndex?: number
}

export async function createUpload(input: CreateUploadInput) {
  const { orderItemId, filename, filePath, size, mime, dpi, widthPx, heightPx, status = 'PENDING', uploadType, uploadIndex } = input

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
      uploadType: uploadType ?? null,
      uploadIndex: uploadIndex ?? null,
    },
  })
}

// Replace an upload for the same slot (orderItemId + uploadType + uploadIndex).
// Deletes the old file from disk and the old DB record, then creates a new one.
export async function replaceOrCreateUpload(input: CreateUploadInput) {
  const { orderItemId, uploadType, uploadIndex } = input

  if (uploadType != null) {
    const existing = await db.uploadFile.findFirst({
      where: {
        orderItemId,
        uploadType,
        uploadIndex: uploadIndex ?? null,
      },
    })
    if (existing) {
      if (existing.filePath) deleteFile(existing.filePath)
      await db.uploadFile.delete({ where: { id: existing.id } })
    }
  }

  return createUpload(input)
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
