import { db } from '@/lib/db'
import { calculatePrice, PricingInput } from '@/lib/pricing'
import { assert, assertExists } from '@/lib/assert'
import { validateProductSize } from '@/lib/productRules'
import { ValidationError } from '@/lib/errors'

const cartInclude = {
  items: {
    include: {
      product: true,
      variant: true,
    },
  },
} as const

export async function getOrCreateCart(userId: string) {
  const existing = await db.cart.findUnique({
    where: { userId },
    include: cartInclude,
  })
  if (existing) return existing

  return db.cart.create({
    data: { userId },
    include: cartInclude,
  })
}

export interface AddToCartInput {
  userId: string
  productId: string
  variantId?: string
  width?: number
  height?: number
  quantity: number
  express?: boolean
  optionValueIds?: string[]
  placement?: string
}

export async function addToCart(input: AddToCartInput) {
  const { userId, productId, variantId, width, height, quantity, express, optionValueIds, placement } = input

  assert(quantity > 0, 'quantity must be greater than 0')
  if (width != null) assert(width > 0, 'width must be greater than 0')
  if (height != null) assert(height > 0, 'height must be greater than 0')

  const product = await db.product.findUnique({ where: { id: productId, active: true }, select: { id: true } })
  assertExists(product, `Product not found: ${productId}`)

  // Step 327 — validate variant belongs to this product
  if (variantId) {
    const variant = await db.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } })
    if (!variant) throw new ValidationError(`Variant not found: ${variantId}`)
    if (variant.productId !== productId) throw new ValidationError('Variant does not belong to this product')
  }

  // Step 327 — validate all option values belong to options of this product
  if (optionValueIds && optionValueIds.length > 0) {
    const valid = await db.productOptionValue.findMany({
      where: { id: { in: optionValueIds }, option: { productId } },
      select: { id: true },
    })
    if (valid.length !== optionValueIds.length) {
      throw new ValidationError('One or more option values are invalid for this product')
    }
  }

  // Validate product size rules
  if (width != null && height != null) {
    const config = await db.productConfig.findUnique({ where: { productId }, select: { maxWidthCm: true, maxHeightCm: true, dtfMaxWidthCm: true, rollWidthCm: true, printAreaWidthCm: true, printAreaHeightCm: true } })
    if (config) {
      const rules = {
        maxWidthCm: config.maxWidthCm != null ? Number(config.maxWidthCm) : null,
        maxHeightCm: config.maxHeightCm != null ? Number(config.maxHeightCm) : null,
        dtfMaxWidthCm: config.dtfMaxWidthCm != null ? Number(config.dtfMaxWidthCm) : null,
        rollWidthCm: config.rollWidthCm != null ? Number(config.rollWidthCm) : null,
        printAreaWidthCm: config.printAreaWidthCm != null ? Number(config.printAreaWidthCm) : null,
        printAreaHeightCm: config.printAreaHeightCm != null ? Number(config.printAreaHeightCm) : null,
      }
      const result = validateProductSize(rules, width, height)
      if (!result.ok) throw new ValidationError(result.message)
    }
  }

  const cart = await getOrCreateCart(userId)

  const pricingInput: PricingInput = {
    productId,
    variantId,
    width,
    height,
    quantity,
    deliveryType: express ? 'EXPRESS' : 'STANDARD',
    optionValueIds,
  }

  const { unitPrice } = await calculatePrice(pricingInput)

  await db.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      variantId: variantId ?? null,
      width: width ?? 0,
      height: height ?? 0,
      quantity,
      priceSnapshot: unitPrice,
      express: express ?? false,
      placement: placement ?? null,
    },
  })

  return db.cart.findUniqueOrThrow({
    where: { userId },
    include: cartInclude,
  })
}

export async function removeFromCart(cartItemId: string) {
  return db.cartItem.delete({
    where: { id: cartItemId },
  })
}

export async function getCart(userId: string) {
  return db.cart.findUnique({
    where: { userId },
    include: cartInclude,
  })
}
