'use client'

import { useState } from 'react'

type DeliveryType = 'STANDARD' | 'EXPRESS' | 'PICKUP'

const DELIVERY_OPTIONS: { value: DeliveryType; label: string; desc: string }[] = [
  { value: 'STANDARD', label: 'Standard', desc: '3–5 business days' },
  { value: 'EXPRESS', label: 'Express', desc: '1–2 business days' },
  { value: 'PICKUP', label: 'Pickup', desc: 'Collect in store' },
]

export default function CheckoutForm() {
  const [delivery, setDelivery] = useState<DeliveryType>('STANDARD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      // Create order from cart — userId resolved server-side from cookie
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryType: delivery }),
      })
      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not create order.')
      }
      const order = await orderRes.json()

      // Create Stripe checkout session
      const sessionRes = await fetch(`/api/orders/${order.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!sessionRes.ok) {
        const body = await sessionRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not start payment.')
      }
      const { url } = await sessionRes.json()
      if (url) window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Delivery selector */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-700">Delivery method</p>
        <div className="flex flex-col gap-2">
          {DELIVERY_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDelivery(value)}
              className={[
                'flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors',
                delivery === value
                  ? 'border-gray-900 bg-gray-50 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              <span className="font-medium">{label}</span>
              <span className={delivery === value ? 'text-gray-600 text-xs' : 'text-gray-400 text-xs'}>
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="btn-primary justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating order…' : 'Place Order →'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        You will be redirected to our secure payment page.
      </p>
    </div>
  )
}
