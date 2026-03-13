import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/client'
import { assert } from '@/lib/assert'
import { ValidationError } from '@/lib/errors'

const toNum = (d: Decimal | null | undefined): number =>
  d ? parseFloat(d.toString()) : 0

// ---------------------------------------------------------------------------
// Price calculation (uses ShippingRule table)
// ---------------------------------------------------------------------------

export interface ShippingContext {
  /** max(width, height) across all cart items in cm */
  maxSide?: number
  /** billing country ISO alpha-2 */
  country?: string
  /** total quantity across all items */
  quantity?: number
}

type RuleRow = {
  method: string | null
  country: string | null
  minSize: number | null
  maxSize: number | null
  minQty: number | null
  maxQty: number | null
}

function matchesMethod(rule: Pick<RuleRow, 'method'>, type: string): boolean {
  return rule.method === null || rule.method === type
}
function matchesCountry(rule: Pick<RuleRow, 'country'>, country?: string): boolean {
  return rule.country === null || rule.country === country
}
function matchesSize(rule: Pick<RuleRow, 'minSize' | 'maxSize'>, maxSide?: number): boolean {
  if (maxSide === undefined) return true
  if (rule.minSize !== null && maxSide < rule.minSize) return false
  if (rule.maxSize !== null && maxSide > rule.maxSize) return false
  return true
}
function matchesQty(rule: Pick<RuleRow, 'minQty' | 'maxQty'>, quantity?: number): boolean {
  if (quantity === undefined) return true
  if (rule.minQty !== null && quantity < rule.minQty) return false
  if (rule.maxQty !== null && quantity > rule.maxQty) return false
  return true
}

export async function calculateShipping(
  subtotal: number,
  deliveryType: string,
  context: ShippingContext = {},
): Promise<number> {
  assert(subtotal >= 0, 'subtotal must be >= 0')
  if (deliveryType === 'PICKUP') return 0

  const { maxSide, country, quantity } = context
  const rules = await db.shippingRule.findMany()

  // 1. FREE_OVER — free shipping threshold
  const freeOverRule = rules.find(
    (r) =>
      r.type === 'FREE_OVER' &&
      matchesMethod(r, deliveryType) &&
      matchesCountry(r, country) &&
      r.minTotal != null &&
      subtotal >= toNum(r.minTotal),
  )
  if (freeOverRule) return 0

  // 2. SIZE_TIER — size + country + method-based base price
  const sizeTierRule = rules.find(
    (r) =>
      r.type === 'SIZE_TIER' &&
      matchesMethod(r, deliveryType) &&
      matchesCountry(r, country) &&
      matchesSize(r, maxSide) &&
      matchesQty(r, quantity),
  )

  // 3. FLAT — fallback base price (method-specific or catch-all)
  const flatRule = rules.find((r) => r.type === 'FLAT' && matchesMethod(r, deliveryType))

  let baseCost = sizeTierRule
    ? toNum(sizeTierRule.price)
    : flatRule
    ? toNum(flatRule.price)
    : 5 // hard fallback €5

  // 4. COUNTRY_SURCHARGE — additive per-country surcharge
  const surchargeRule = rules.find(
    (r) =>
      r.type === 'COUNTRY_SURCHARGE' &&
      matchesMethod(r, deliveryType) &&
      r.country !== null &&
      r.country === country,
  )
  if (surchargeRule) baseCost += toNum(surchargeRule.price)

  // 5. EXPRESS multiplier
  if (deliveryType === 'EXPRESS') {
    const expressRule = rules.find((r) => r.type === 'EXPRESS_MULTIPLIER')
    const multiplier = expressRule ? toNum(expressRule.multiplier) : 1.5
    baseCost = baseCost * multiplier
  }

  return parseFloat(baseCost.toFixed(2))
}

// ---------------------------------------------------------------------------
// ShippingMethod resolver
// ---------------------------------------------------------------------------

// Map DeliveryType → ShippingMethod.type
const DELIVERY_TO_METHOD: Record<string, string> = {
  PICKUP:   'PICKUP',
  EXPRESS:  'EXPRESS',
  STANDARD: 'DELIVERY',
}

export async function resolveShippingMethod(deliveryType: string, isLargeFormat = false) {
  const methodType = isLargeFormat ? 'MANUAL' : (DELIVERY_TO_METHOD[deliveryType] ?? 'DELIVERY')
  return db.shippingMethod.findFirst({ where: { type: methodType, active: true } })
}

// ---------------------------------------------------------------------------
// Restriction validation (steps 154, 156, 158)
// ---------------------------------------------------------------------------

interface CartItemForValidation {
  width: Decimal
  product: {
    name: string
    config: {
      isRoll: boolean
      pickupAllowed: boolean | null
      shippingRequired: boolean
    } | null
    productCategory: {
      name: string
      allowShipping: boolean
      allowPickup: boolean
    } | null
  }
}

export function validateShippingRestrictions(
  deliveryType: string,
  cartItems: CartItemForValidation[],
): void {
  for (const item of cartItems) {
    const config = item.product.config
    const category = item.product.productCategory
    const name = item.product.name

    // Step 154 — pickup restrictions
    if (deliveryType === 'PICKUP') {
      if (config?.pickupAllowed === false) {
        throw new ValidationError(`"${name}" does not allow pickup.`)
      }
      if (category?.allowPickup === false) {
        throw new ValidationError(`Category "${category.name}" does not allow pickup.`)
      }
    }

    // Step 158 — category shipping restrictions
    if (deliveryType !== 'PICKUP') {
      if (category?.allowShipping === false) {
        throw new ValidationError(`Category "${category.name}" does not allow shipping.`)
      }
    }

    // Step 156 — large format roll: no standard shipping above 100 cm width
    if (
      config?.isRoll &&
      Number(item.width) > 100 &&
      deliveryType === 'STANDARD'
    ) {
      throw new ValidationError(
        `"${name}" is a large format roll item (width > 100 cm). Standard shipping is not available. Choose pickup or request manual shipping.`
      )
    }
  }
}

// Helper: detect if any cart item is large-format roll
export function hasLargeFormatItem(cartItems: CartItemForValidation[]): boolean {
  return cartItems.some(
    (item) => item.product.config?.isRoll && Number(item.width) > 100
  )
}
