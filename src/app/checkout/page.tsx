import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import CheckoutWizard from './CheckoutWizard'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const userId = cookies().get('replica_uid')?.value ?? null
  if (!userId) redirect('/cart')

  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          variant: { select: { name: true } },
        },
      },
    },
  })

  if (!cart || cart.items.length === 0) redirect('/cart')

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  const isGuest = user?.email?.startsWith('guest_') ?? true

  const subtotal = cart.items.reduce(
    (s, i) => s + Number(i.priceSnapshot) * i.quantity,
    0,
  )

  const cartItems = cart.items.map(i => ({
    id: i.id,
    name: i.product.name,
    variant: i.variant?.name ?? null,
    width: Number(i.width),
    height: Number(i.height),
    quantity: i.quantity,
    lineTotal: Number(i.priceSnapshot) * i.quantity,
  }))

  return (
    <CheckoutWizard
      userId={userId}
      isGuest={isGuest}
      userName={user?.name ?? null}
      cartItems={cartItems}
      subtotal={subtotal}
    />
  )
}
