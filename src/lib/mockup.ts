import { db } from '@/lib/db'
import { assertExists } from '@/lib/assert'
import { generateMockup } from '@/lib/mockupGenerator'

export async function getMockupTemplate(productId: string) {
  return db.mockupTemplate.findFirst({
    where: { productId },
  })
}

export async function createPreview(orderItemId: string, uploadPath: string): Promise<string> {
  const orderItem = await db.orderItem.findUnique({ where: { id: orderItemId } })
  assertExists(orderItem, `OrderItem not found: ${orderItemId}`)

  // Generate real canvas composite
  const previewUrl = await generateMockup(orderItemId, uploadPath)

  await db.orderItem.update({
    where: { id: orderItemId },
    data: { previewUrl },
  })

  return previewUrl
}
