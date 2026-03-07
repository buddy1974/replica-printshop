import { db } from '@/lib/db'

export async function getProductConfig(productId: string) {
  return db.productConfig.findUnique({
    where: { productId },
  })
}

export async function upsertProductConfig(
  productId: string,
  data: {
    type: string
    hasCustomSize?: boolean
    hasFixedSizes?: boolean
    hasVariants?: boolean
    hasOptions?: boolean
    fixedSizes?: string
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    printWidth?: number
    printHeight?: number
    pricingType?: string
    pickupAllowed?: boolean
    notes?: string
  },
) {
  return db.productConfig.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  })
}
