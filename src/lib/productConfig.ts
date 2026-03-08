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
    maxWidthCm?: number
    maxHeightCm?: number
    rollWidthCm?: number
    dtfMaxWidthCm?: number
    cutOnly?: boolean
    printAndCut?: boolean
    needsUpload?: boolean
    priceMode?: string
    printAreaWidthCm?: number
    printAreaHeightCm?: number
    placementMode?: string
    isTextile?: boolean
    isRoll?: boolean
    isCut?: boolean
    isPrintCut?: boolean
    isDTF?: boolean
    needsPlacement?: boolean
    productionType?: string
    setupPrice?: number
    notes?: string
  },
) {
  return db.productConfig.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  })
}
