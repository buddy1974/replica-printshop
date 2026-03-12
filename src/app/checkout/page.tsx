import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'
import { db } from '@/lib/db'
import CheckoutForm from './CheckoutForm'

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

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
    0,
  )

  return (
    <Container>
      {/* Breadcrumb + title */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">
          <Link href="/cart" className="hover:text-gray-700 transition-colors">
            Cart
          </Link>
          {' → '}
          <span className="text-gray-700">Checkout</span>
        </p>
        <h1>Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left — order items */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 pt-5 pb-3">
            Order items ({cart.items.length})
          </p>
          <div className="divide-y divide-gray-100">
            {cart.items.map((item) => (
              <div key={item.id} className="px-5 py-4 flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                  {item.variant && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Number(item.width) > 0 && Number(item.height) > 0
                      ? `${Number(item.width)} × ${Number(item.height)} cm · `
                      : ''}
                    Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">
                  €{(Number(item.priceSnapshot) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — summary + form */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Order summary
          </p>
          <div className="flex flex-col gap-3 text-sm mb-5">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>Shipping</span>
              <span>Calculated at order</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-3 mt-1">
              <span>Total</span>
              <span>from €{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <CheckoutForm />
        </div>

      </div>
    </Container>
  )
}
