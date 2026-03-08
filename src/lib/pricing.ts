import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/client'
import { calculateShipping } from '@/lib/shipping'
import { assert, assertExists } from '@/lib/assert'
import { validateProductSize } from '@/lib/productRules'
import { ValidationError } from '@/lib/errors'

export interface PricingInput {
  productId: string
  variantId?: string
  width?: number
  height?: number
  quantity: number
  deliveryType?: string
  optionValueIds?: string[]
}

export interface PricingResult {
  unitPrice: number
  totalPrice: number
  shippingPrice: number
}

const toNum = (d: Decimal | null | undefined): number =>
  d ? parseFloat(d.toString()) : 0

// ---------------------------------------------------------------------------
// Table price resolution
// ---------------------------------------------------------------------------

function resolveTablePrice(
  tables: Awaited<ReturnType<typeof db.pricingTable.findMany>>,
  quantity: number,
  width?: number,
  height?: number,
  priceMode?: string | null,
): number | null {
  const byType = (type: string) => tables.filter((t) => t.type === type)

  // --- Mode-specific resolution first ---

  // METER: price per linear meter, using height (cm → m)
  if (priceMode === 'METER') {
    const row = byType('METER')[0]
    if (row?.pricePerMeter != null && height != null) {
      return (height / 100) * toNum(row.pricePerMeter)
    }
  }

  // PIECE: flat price per piece (FIXED table row)
  if (priceMode === 'PIECE') {
    const fixed = byType('FIXED')[0]
    if (fixed) return toNum(fixed.price)
  }

  // TIER: quantity-tier pricing (QUANTITY table rows)
  if (priceMode === 'TIER') {
    const tier = byType('QUANTITY').find((t) => {
      const minOk = t.minQty == null || quantity >= t.minQty
      const maxOk = t.maxQty == null || quantity <= t.maxQty
      return minOk && maxOk
    })
    if (tier) return toNum(tier.price)
  }

  // --- Default fallback: FIXED → QUANTITY → AREA → METER ---

  const fixed = byType('FIXED')[0]
  if (fixed) return toNum(fixed.price)

  const qty = byType('QUANTITY').find((t) => {
    const minOk = t.minQty == null || quantity >= t.minQty
    const maxOk = t.maxQty == null || quantity <= t.maxQty
    return minOk && maxOk
  })
  if (qty) return toNum(qty.price)

  if (width != null && height != null) {
    const area = byType('AREA').find((t) => {
      const wOk = (t.minWidth == null || width >= t.minWidth) && (t.maxWidth == null || width <= t.maxWidth)
      const hOk = (t.minHeight == null || height >= t.minHeight) && (t.maxHeight == null || height <= t.maxHeight)
      return wOk && hOk
    })
    if (area) {
      if (area.pricePerM2 != null) {
        return ((width * height) / 10_000) * toNum(area.pricePerM2)
      }
      return toNum(area.price)
    }
  }

  // METER fallback (for roll products without explicit priceMode)
  if (height != null) {
    const meterRow = byType('METER')[0]
    if (meterRow?.pricePerMeter != null) {
      return (height / 100) * toNum(meterRow.pricePerMeter)
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Main pricing function
// ---------------------------------------------------------------------------

export async function calculatePrice(input: PricingInput): Promise<PricingResult> {
  const { productId, variantId, width, height, quantity, deliveryType = 'STANDARD', optionValueIds = [] } = input

  assert(quantity > 0, 'quantity must be greater than 0')
  if (width != null) assert(width > 0, 'width must be greater than 0')
  if (height != null) assert(height > 0, 'height must be greater than 0')

  const express = deliveryType === 'EXPRESS'

  // Fetch product with category (for defaultPriceMode fallback)
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, productCategory: { select: { defaultPriceMode: true } } },
  })
  assertExists(product, `Product not found: ${productId}`)

  // Validate product size rules
  if (width != null && height != null) {
    const sizeConfig = await db.productConfig.findUnique({
      where: { productId },
      select: {
        maxWidthCm: true, maxHeightCm: true, dtfMaxWidthCm: true,
        rollWidthCm: true, printAreaWidthCm: true, printAreaHeightCm: true,
      },
    })
    if (sizeConfig) {
      const rules = {
        maxWidthCm:        sizeConfig.maxWidthCm        != null ? Number(sizeConfig.maxWidthCm)        : null,
        maxHeightCm:       sizeConfig.maxHeightCm       != null ? Number(sizeConfig.maxHeightCm)       : null,
        dtfMaxWidthCm:     sizeConfig.dtfMaxWidthCm     != null ? Number(sizeConfig.dtfMaxWidthCm)     : null,
        rollWidthCm:       sizeConfig.rollWidthCm       != null ? Number(sizeConfig.rollWidthCm)       : null,
        printAreaWidthCm:  sizeConfig.printAreaWidthCm  != null ? Number(sizeConfig.printAreaWidthCm)  : null,
        printAreaHeightCm: sizeConfig.printAreaHeightCm != null ? Number(sizeConfig.printAreaHeightCm) : null,
      }
      const result = validateProductSize(rules, width, height)
      if (!result.ok) throw new ValidationError(result.message)
    }
  }

  const [variant, pricingRule, pricingTables, optionValues, config] = await Promise.all([
    variantId
      ? db.productVariant.findUnique({ where: { id: variantId } })
      : null,
    db.pricingRule.findFirst({ where: { productId } }),
    db.pricingTable.findMany({ where: { productId } }),
    optionValueIds.length > 0
      ? db.productOptionValue.findMany({ where: { id: { in: optionValueIds } } })
      : [],
    db.productConfig.findUnique({
      where: { productId },
      select: { isCut: true, isRoll: true, isTextile: true, priceMode: true, setupPrice: true },
    }),
  ])

  if (variantId) assertExists(variant, `Variant not found: ${variantId}`)

  // Effective priceMode: config → category default → null
  const priceMode = config?.priceMode || product.productCategory?.defaultPriceMode || null

  let unitPrice = toNum(variant?.basePrice)

  // Resolve table price (with priceMode hint)
  const tablePrice = pricingTables.length > 0
    ? resolveTablePrice(pricingTables, quantity, width, height, priceMode)
    : null

  if (tablePrice != null) {
    let resolved = tablePrice
    const minPrice = pricingRule ? toNum(pricingRule.minPrice) : 0
    if (resolved < minPrice) resolved = minPrice
    unitPrice += resolved
  } else if (pricingRule && width != null) {
    // Fallback: area pricing. isCut/isRoll: price per linear 100 cm (width only)
    const effectiveHeight = (config?.isCut || config?.isRoll) ? 100 : (height ?? 100)
    const areaSqm = (width * effectiveHeight) / 10_000
    let areaPrice = areaSqm * toNum(pricingRule.pricePerM2)
    const minPrice = toNum(pricingRule.minPrice)
    if (areaPrice < minPrice) areaPrice = minPrice
    unitPrice += areaPrice
  }

  // Option additive modifiers + multipliers
  let optionAdded = 0
  let optionMultiplier = 1
  for (const ov of optionValues) {
    optionAdded += toNum(ov.priceModifier)
    if (ov.multiplier != null) optionMultiplier *= toNum(ov.multiplier)
  }
  unitPrice = (unitPrice + optionAdded) * optionMultiplier

  // Express multiplier — applied last to unit price
  if (express && pricingRule) {
    unitPrice *= toNum(pricingRule.expressMultiplier)
  }

  const subtotal = parseFloat((unitPrice * quantity).toFixed(2))

  // Setup cost: one-time charge, not multiplied by quantity
  const setupCost = config?.setupPrice != null ? parseFloat(toNum(config.setupPrice).toFixed(2)) : 0

  const shippingPrice = await calculateShipping(subtotal + setupCost, deliveryType)
  const totalPrice = subtotal + setupCost + shippingPrice

  const finalUnitPrice = parseFloat(unitPrice.toFixed(2))
  assert(finalUnitPrice >= 0, 'Calculated unit price is negative — check pricing rules')

  return {
    unitPrice: finalUnitPrice,
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    shippingPrice,
  }
}
