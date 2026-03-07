import { db } from '@/lib/db'
import { calculatePrice, PricingInput } from '@/lib/pricing'
import { assert, assertExists } from '@/lib/assert'

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
}

export async function addToCart(input: AddToCartInput) {
  const { userId, productId, variantId, width, height, quantity, express, optionValueIds } = input

  assert(quantity > 0, 'quantity must be greater than 0')
  if (width != null) assert(width > 0, 'width must be greater than 0')
  if (height != null) assert(height > 0, 'height must be greater than 0')

  const product = await db.product.findUnique({ where: { id: productId, active: true }, select: { id: true } })
  assertExists(product, `Product not found: ${productId}`)

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
