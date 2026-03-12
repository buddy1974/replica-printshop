'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CheckoutProcessingPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing your order…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentIntentId = params.get('payment_intent')

    if (!paymentIntentId) {
      router.replace('/checkout')
      return
    }

    // Read wizard state from sessionStorage (set during checkout)
    let wizardState: {
      billing?: { firstName: string; lastName: string; email: string; phone?: string; country: string; street: string; city: string; postalCode: string }
      deliveryAddr?: { firstName: string; lastName: string; phone?: string; country: string; street: string; city: string; postalCode: string } | null
      sameAsBilling?: boolean
      deliveryType?: string
    } | null = null

    try {
      const saved = sessionStorage.getItem('checkout_wizard')
      if (saved) wizardState = JSON.parse(saved)
    } catch {}

    if (!wizardState?.billing || !wizardState?.deliveryType) {
      setMessage('Session expired. Please restart checkout.')
      return
    }

    fetch('/api/checkout/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        deliveryType: wizardState.deliveryType,
        billing: wizardState.billing,
        deliveryAddr: wizardState.deliveryAddr ?? null,
        sameAsBilling: wizardState.sameAsBilling ?? true,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.orderId) {
          sessionStorage.removeItem('checkout_wizard')
          router.replace(`/order-success?order=${d.orderId}`)
        } else {
          setMessage(d.error ?? 'Order could not be completed. Please contact support.')
        }
      })
      .catch(() => setMessage('Connection error. Please contact support.'))
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-2 border-gray-200 border-t-red-600 rounded-full mx-auto" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}
