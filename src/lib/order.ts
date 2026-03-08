import { db } from '@/lib/db'
import { DeliveryType } from '@/generated/prisma/client'
import { calculateShipping, validateShippingRestrictions, resolveShippingMethod, hasLargeFormatItem } from '@/lib/shipping'
import { ValidationError } from '@/lib/errors'

export async function createOrderFromCart(userId: string, deliveryType: DeliveryType) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              productCategory: true,
              config: true,
            },
          },
          variant: true,
        },
      },
    },
  })

  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cannot create order: cart is empty')
  }

  // Validate shipping restrictions (steps 154, 156, 158)
  validateShippingRestrictions(deliveryType, cart.items)

  const itemsSubtotal = cart.items.reduce((sum, item) => {
    return sum + parseFloat(item.priceSnapshot.toString()) * item.quantity
  }, 0)

  const isLargeFormat = hasLargeFormatItem(cart.items)
  const shippingPrice = await calculateShipping(itemsSubtotal, deliveryType)
  const total = itemsSubtotal + shippingPrice

  // Resolve which shipping method to attach to the order
  const shippingMethod = await resolveShippingMethod(deliveryType, isLargeFormat)

  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        total,
        shippingPrice,
        deliveryType,
        shippingMethodId: shippingMethod?.id ?? null,
        items: {
          create: cart.items.map((item) => ({
            productName: item.product.name,
            variantName: item.variant?.name ?? null,
            categoryName: item.product.productCategory?.name ?? item.product.category ?? null,
            productionTypeSnapshot: item.product.config?.productionType ?? null,
            width: item.width,
            height: item.height,
            quantity: item.quantity,
            priceSnapshot: item.priceSnapshot,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    })

    return newOrder
  })

  return order
}
