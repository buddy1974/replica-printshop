import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/client'
import { assert } from '@/lib/assert'
import { ValidationError } from '@/lib/errors'

const toNum = (d: Decimal | null | undefined): number =>
  d ? parseFloat(d.toString()) : 0

// ---------------------------------------------------------------------------
// Price calculation (uses ShippingRule table)
// ---------------------------------------------------------------------------

export async function calculateShipping(subtotal: number, deliveryType: string): Promise<number> {
  assert(subtotal >= 0, 'subtotal must be >= 0')
  if (deliveryType === 'PICKUP') return 0

  const rules = await db.shippingRule.findMany()

  const freeOver = rules.find((r) => r.type === 'FREE_OVER')
  if (freeOver && freeOver.minTotal != null && subtotal >= toNum(freeOver.minTotal)) {
    return 0
  }

  const flat = rules.find((r) => r.type === 'FLAT')
  let shippingCost = flat ? toNum(flat.price) : 5

  if (deliveryType === 'EXPRESS') {
    const expressRule = rules.find((r) => r.type === 'EXPRESS_MULTIPLIER')
    const multiplier = expressRule ? toNum(expressRule.multiplier) : 1.5
    shippingCost = shippingCost * multiplier
  }

  return parseFloat(shippingCost.toFixed(2))
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
