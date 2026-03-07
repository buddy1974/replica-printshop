import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/client'
import { assert } from '@/lib/assert'

const toNum = (d: Decimal | null | undefined): number =>
  d ? parseFloat(d.toString()) : 0

export async function calculateShipping(subtotal: number, deliveryType: string): Promise<number> {
  assert(subtotal >= 0, 'subtotal must be >= 0')
  if (deliveryType === 'PICKUP') return 0

  const rules = await db.shippingRule.findMany()

  // Check FREE_OVER: if subtotal >= minTotal, shipping is free
  const freeOver = rules.find((r) => r.type === 'FREE_OVER')
  if (freeOver && freeOver.minTotal != null && subtotal >= toNum(freeOver.minTotal)) {
    return 0
  }

  // Base flat rate
  const flat = rules.find((r) => r.type === 'FLAT')
  let shippingCost = flat ? toNum(flat.price) : 5 // default fallback

  // For EXPRESS, apply multiplier
  if (deliveryType === 'EXPRESS') {
    const expressRule = rules.find((r) => r.type === 'EXPRESS_MULTIPLIER')
    const multiplier = expressRule ? toNum(expressRule.multiplier) : 1.5
    shippingCost = shippingCost * multiplier
  }

  return parseFloat(shippingCost.toFixed(2))
}
