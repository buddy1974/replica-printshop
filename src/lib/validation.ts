import { db } from '@/lib/db'
import { FileStatus } from '@/generated/prisma/client'
import { assertExists } from '@/lib/assert'
import { ValidationError } from '@/lib/errors'

const FALLBACK_MIN_DPI = 150
const FALLBACK_RECOMMENDED_DPI = 300

export interface ValidationResult {
  status: FileStatus
  dpi: number
  widthCm: number
  heightCm: number
  message: string
}

export async function validateUpload(uploadId: string): Promise<ValidationResult> {
  const upload = await db.uploadFile.findUnique({
    where: { id: uploadId },
    include: { orderItem: true },
  })

  assertExists(upload, `Upload not found: ${uploadId}`)

  const { dpi, widthPx, heightPx, orderItem } = upload

  if (!dpi || !widthPx || !heightPx) {
    throw new ValidationError('Upload is missing file dimensions (dpi, widthPx, heightPx) — cannot validate')
  }

  const product = await db.product.findFirst({
    where: { name: orderItem.productName },
    select: { id: true, minDpi: true, recommendedDpi: true },
  })

  const config = product
    ? await db.productConfig.findUnique({ where: { productId: product.id } })
    : null

  const minDpi = product?.minDpi ?? FALLBACK_MIN_DPI
  const recommendedDpi = product?.recommendedDpi ?? FALLBACK_RECOMMENDED_DPI

  const widthCm = (widthPx / dpi) * 2.54
  const heightCm = (heightPx / dpi) * 2.54

  const orderWidthCm = parseFloat(orderItem.width.toString())
  const orderHeightCm = parseFloat(orderItem.height.toString())

  let status: FileStatus
  let message: string

  if (dpi < minDpi) {
    status = 'REJECTED'
    message = `DPI too low (${dpi} dpi). Minimum required is ${minDpi} dpi.`
  } else if (config?.printWidth && config?.printHeight && (widthCm < config.printWidth || heightCm < config.printHeight)) {
    status = 'REJECTED'
    message =
      `File too small for print area. Got ${widthCm.toFixed(1)} × ${heightCm.toFixed(1)} cm, ` +
      `print area requires ${config.printWidth} × ${config.printHeight} cm.`
  } else if (widthCm < orderWidthCm || heightCm < orderHeightCm) {
    status = 'REJECTED'
    message =
      `File size too small. Got ${widthCm.toFixed(1)} × ${heightCm.toFixed(1)} cm, ` +
      `expected at least ${orderWidthCm} × ${orderHeightCm} cm.`
  } else if (dpi < recommendedDpi) {
    status = 'APPROVED'
    message = `Approved with warning: DPI is ${dpi}. Recommended is ${recommendedDpi} dpi for best print quality.`
  } else {
    status = 'APPROVED'
    message = `File approved. ${dpi} dpi, ${widthCm.toFixed(1)} × ${heightCm.toFixed(1)} cm.`
  }

  await db.uploadFile.update({
    where: { id: uploadId },
    data: { status },
  })

  // When approved, transition order to UPLOADED
  if (status === 'APPROVED') {
    const orderId = upload.orderItem.orderId
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    })
    if (order && order.status === 'CONFIRMED') {
      await db.order.update({
        where: { id: orderId },
        data: { status: 'UPLOADED' },
      })
    }
  }

  return { status, dpi, widthCm, heightCm, message }
}
