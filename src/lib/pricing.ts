import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/client'
import { calculateShipping } from '@/lib/shipping'
import { assert, assertExists } from '@/lib/assert'

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

function resolveTablePrice(
  tables: Awaited<ReturnType<typeof db.pricingTable.findMany>>,
  quantity: number,
  width?: number,
  height?: number,
): number | null {
  // Priority: FIXED → QUANTITY → AREA → no match
  const byType = (type: string) => tables.filter((t) => t.type === type)

  // FIXED — always matches (use first)
  const fixed = byType('FIXED')[0]
  if (fixed) return toNum(fixed.price)

  // QUANTITY — match by qty range
  const qty = byType('QUANTITY').find((t) => {
    const minOk = t.minQty == null || quantity >= t.minQty
    const maxOk = t.maxQty == null || quantity <= t.maxQty
    return minOk && maxOk
  })
  if (qty) return toNum(qty.price)

  // AREA — match by size range, use pricePerM2 or flat price
  if (width != null && height != null) {
    const area = byType('AREA').find((t) => {
      const wOk = (t.minWidth == null || width >= t.minWidth) && (t.maxWidth == null || width <= t.maxWidth)
      const hOk = (t.minHeight == null || height >= t.minHeight) && (t.maxHeight == null || height <= t.maxHeight)
      return wOk && hOk
    })
    if (area) {
      if (area.pricePerM2 != null) {
        const areaSqm = (width * height) / 10_000
        return areaSqm * toNum(area.pricePerM2)
      }
      return toNum(area.price)
    }
  }

  return null
}

export async function calculatePrice(input: PricingInput): Promise<PricingResult> {
  const { productId, variantId, width, height, quantity, deliveryType = 'STANDARD', optionValueIds = [] } = input

  assert(quantity > 0, 'quantity must be greater than 0')
  if (width != null) assert(width > 0, 'width must be greater than 0')
  if (height != null) assert(height > 0, 'height must be greater than 0')

  const express = deliveryType === 'EXPRESS'

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
  assertExists(product, `Product not found: ${productId}`)

  const [variant, pricingRule, pricingTables, optionValues] = await Promise.all([
    variantId
      ? db.productVariant.findUnique({ where: { id: variantId } })
      : null,
    db.pricingRule.findFirst({ where: { productId } }),
    db.pricingTable.findMany({ where: { productId } }),
    optionValueIds.length > 0
      ? db.productOptionValue.findMany({ where: { id: { in: optionValueIds } } })
      : [],
  ])

  if (variantId) assertExists(variant, `Variant not found: ${variantId}`)

  let unitPrice = toNum(variant?.basePrice)

  // Try pricing table first
  const tablePrice = pricingTables.length > 0
    ? resolveTablePrice(pricingTables, quantity, width, height)
    : null

  if (tablePrice != null) {
    // Table match: apply minPrice guard from rule if set
    let resolved = tablePrice
    const minPrice = pricingRule ? toNum(pricingRule.minPrice) : 0
    if (resolved < minPrice) resolved = minPrice
    unitPrice += resolved
  } else if (pricingRule && width != null && height != null) {
    // Fallback: classic area pricing
    const areaSqm = (width * height) / 10_000
    let areaPrice = areaSqm * toNum(pricingRule.pricePerM2)
    const minPrice = toNum(pricingRule.minPrice)
    if (areaPrice < minPrice) areaPrice = minPrice
    unitPrice += areaPrice
  }

  // Option modifiers
  for (const ov of optionValues) {
    unitPrice += toNum(ov.priceModifier)
  }

  // Express multiplier (from pricing rule)
  if (express && pricingRule) {
    unitPrice *= toNum(pricingRule.expressMultiplier)
  }

  const subtotal = parseFloat((unitPrice * quantity).toFixed(2))
  const shippingPrice = await calculateShipping(subtotal, deliveryType)
  const totalPrice = subtotal + shippingPrice

  const finalUnitPrice = parseFloat(unitPrice.toFixed(2))
  assert(finalUnitPrice >= 0, 'Calculated unit price is negative — check pricing rules')

  return {
    unitPrice: finalUnitPrice,
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    shippingPrice,
  }
}
