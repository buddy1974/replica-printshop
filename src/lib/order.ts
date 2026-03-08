import { db } from '@/lib/db'
import { DeliveryType } from '@/generated/prisma/client'
import { calculateShipping } from '@/lib/shipping'
import { ValidationError } from '@/lib/errors'

export async function createOrderFromCart(userId: string, deliveryType: DeliveryType) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { productCategory: true, config: true },
          },
          variant: true,
        },
      },
    },
  })

  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cannot create order: cart is empty')
  }

  const itemsSubtotal = cart.items.reduce((sum, item) => {
    return sum + parseFloat(item.priceSnapshot.toString()) * item.quantity
  }, 0)

  const shippingPrice = await calculateShipping(itemsSubtotal, deliveryType)
  const total = itemsSubtotal + shippingPrice

  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        total,
        shippingPrice,
        deliveryType,
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
