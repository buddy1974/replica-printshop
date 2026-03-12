import { db } from '@/lib/db'
import { DeliveryType } from '@/generated/prisma/client'
import { calculateShipping, validateShippingRestrictions, resolveShippingMethod, hasLargeFormatItem } from '@/lib/shipping'
import { ValidationError } from '@/lib/errors'

export interface GuestAddress {
  name: string
  street: string
  city: string
  zip: string
  country: string
}

export interface CreateOrderOptions {
  /** Real user ID to link to the Order. Null = guest order. Defaults to cartUserId. */
  orderUserId?: string | null
  billingAddress?: GuestAddress
  shippingAddress?: GuestAddress
  /** If true and orderUserId is set, save addresses to the Address table */
  saveAddress?: boolean
}

export async function createOrderFromCart(
  cartUserId: string,
  deliveryType: DeliveryType,
  options: CreateOrderOptions = {},
) {
  const { orderUserId = cartUserId, billingAddress, shippingAddress, saveAddress = false } = options

  const cart = await db.cart.findUnique({
    where: { userId: cartUserId },
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
          design: { select: { id: true, preview: true } },
        },
      },
    },
  })

  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cannot create order: cart is empty')
  }

  validateShippingRestrictions(deliveryType, cart.items)

  const itemsSubtotal = cart.items.reduce((sum, item) => {
    return sum + parseFloat(item.priceSnapshot.toString()) * item.quantity
  }, 0)

  const isLargeFormat = hasLargeFormatItem(cart.items)
  const shippingPrice = await calculateShipping(itemsSubtotal, deliveryType)
  const total = itemsSubtotal + shippingPrice
  const shippingMethod = await resolveShippingMethod(deliveryType, isLargeFormat)

  // Save addresses for registered users if requested
  let billingAddressId: string | null = null
  let shippingAddressId: string | null = null

  if (saveAddress && orderUserId && billingAddress) {
    const saved = await db.address.create({
      data: { userId: orderUserId, ...billingAddress },
    })
    billingAddressId = saved.id
  }
  if (saveAddress && orderUserId && shippingAddress) {
    const saved = await db.address.create({
      data: { userId: orderUserId, ...shippingAddress },
    })
    shippingAddressId = saved.id
  }

  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: orderUserId ?? null,
        total,
        shippingPrice,
        deliveryType,
        shippingMethodId: shippingMethod?.id ?? null,
        billingAddressId,
        shippingAddressId,
        // Inline guest address fields
        billingName:    billingAddress?.name    ?? null,
        billingStreet:  billingAddress?.street  ?? null,
        billingCity:    billingAddress?.city    ?? null,
        billingZip:     billingAddress?.zip     ?? null,
        billingCountry: billingAddress?.country ?? null,
        shippingName:    shippingAddress?.name    ?? null,
        shippingStreet:  shippingAddress?.street  ?? null,
        shippingCity:    shippingAddress?.city    ?? null,
        shippingZip:     shippingAddress?.zip     ?? null,
        shippingCountry: shippingAddress?.country ?? null,
        items: {
          create: cart.items.map((item) => ({
            productName: item.product.name,
            variantName: item.variant?.name ?? null,
            categoryName: item.product.productCategory?.name ?? item.product.category ?? null,
            productionTypeSnapshot: item.product.config?.productionType ?? null,
            productId: item.productId,
            variantId: item.variantId ?? null,
            width: item.width,
            height: item.height,
            quantity: item.quantity,
            priceSnapshot: item.priceSnapshot,
            designId: item.designId ?? null,
            previewUrl: item.design?.preview ?? null,
          })),
        },
      },
      include: { items: true },
    })

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
    return newOrder
  })

  return order
}
