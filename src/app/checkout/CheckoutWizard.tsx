'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import RemoveCartItemButton from '@/components/cart/RemoveCartItemButton'
import { useLocale } from '@/context/LocaleContext'

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartItem {
  id: string
  name: string
  variant: string | null
  width: number
  height: number
  quantity: number
  lineTotal: number
  previewUrl: string | null
}

interface Props {
  userId: string
  isGuest: boolean
  userName: string | null
  cartItems: CartItem[]
  subtotal: number
}

type Step = 'account' | 'address' | 'delivery' | 'payment'
type DeliveryType = 'STANDARD' | 'EXPRESS' | 'PICKUP'

interface BillingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  street: string
  city: string
  postalCode: string
}

interface DeliveryAddress {
  firstName: string
  lastName: string
  phone: string
  country: string
  street: string
  city: string
  postalCode: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_ORDER: Step[] = ['account', 'address', 'delivery', 'payment']
const IC = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

function stepIndex(s: Step) { return STEP_ORDER.indexOf(s) }

function isAddressValid(b: Partial<BillingAddress>): boolean {
  const req: (keyof BillingAddress)[] = ['firstName', 'lastName', 'email', 'country', 'street', 'city', 'postalCode']
  return req.every(f => (b[f] ?? '').trim().length > 0)
}

// ── StepIndicator ─────────────────────────────────────────────────────────────

function StepIndicator({ currentStep, isGuest }: { currentStep: Step; isGuest: boolean }) {
  const { t } = useLocale()
  const tc = t.checkout
  const current = stepIndex(currentStep)
  const STEPS: { key: Step; label: string }[] = [
    { key: 'account', label: tc.account },
    { key: 'address', label: tc.address },
    { key: 'delivery', label: tc.delivery },
    { key: 'payment', label: tc.payment },
  ]
  return (
    <div className="flex items-start justify-between mb-2">
      {STEPS.map(({ key, label }, idx) => {
        const isSkipped = key === 'account' && !isGuest
        const isDone = isSkipped || idx < current
        const isActive = idx === current && !isSkipped
        return (
          <div key={key} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-px ${idx === 0 ? 'opacity-0' : isDone || isActive ? 'bg-red-600' : 'bg-gray-200'}`} />
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                isDone || isActive ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500',
              ].join(' ')}>
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : idx + 1}
              </div>
              <div className={`flex-1 h-px ${idx === STEPS.length - 1 ? 'opacity-0' : isDone ? 'bg-red-600' : 'bg-gray-200'}`} />
            </div>
            <span className={['text-xs mt-1.5', isActive ? 'text-red-600 font-semibold' : isDone ? 'text-red-500' : 'text-gray-400'].join(' ')}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── AccountStep ───────────────────────────────────────────────────────────────

function AccountStep({ onGuest, onRegisterDone }: { onGuest: () => void; onRegisterDone: () => void }) {
  const { t } = useLocale()
  const tc = t.checkout
  const [mode, setMode] = useState<'choose' | 'register'>('choose')
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  const handleRegister = async () => {
    setRegLoading(true)
    setRegError(null)
    try {
      const fullName = `${regFirstName.trim()} ${regLastName.trim()}`.trim()
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email: regEmail.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not create account.')
      }
      onRegisterDone()
    } catch (e) {
      setRegError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setRegLoading(false)
    }
  }

  if (mode === 'register') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{tc.create}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{tc.createDesc}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder={tc.firstName} value={regFirstName} onChange={e => setRegFirstName(e.target.value)} className={IC} />
          <input type="text" placeholder={tc.lastName} value={regLastName} onChange={e => setRegLastName(e.target.value)} className={IC} />
          <div className="col-span-2">
            <input type="email" placeholder={tc.email} value={regEmail} onChange={e => setRegEmail(e.target.value)} className={IC} />
          </div>
          <div className="col-span-2">
            <input type="password" placeholder={`${tc.password} *`} value={regPassword} onChange={e => setRegPassword(e.target.value)} className={IC} />
          </div>
        </div>
        {regError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{regError}</p>
        )}
        <div className="flex items-center gap-4 pt-1">
          <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 underline">
            ← {tc.back}
          </button>
          <button
            type="button"
            onClick={handleRegister}
            disabled={regLoading || !regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword}
            className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {regLoading ? tc.creating : tc.create}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{tc.howToContinue}</h2>

      <button
        type="button"
        onClick={onGuest}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors"
      >
        <span className="text-lg">🛍️</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{tc.guest}</p>
          <p className="text-xs text-gray-500">{tc.guestDesc}</p>
        </div>
      </button>

      <a
        href="/api/auth/google?returnTo=/checkout"
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors"
      >
        <span className="text-lg">🔑</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{tc.google}</p>
          <p className="text-xs text-gray-500">{tc.googleDesc}</p>
        </div>
      </a>

      <button
        type="button"
        onClick={() => setMode('register')}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors"
      >
        <span className="text-lg">✉️</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{tc.create}</p>
          <p className="text-xs text-gray-500">{tc.createDesc}</p>
        </div>
      </button>
    </div>
  )
}

// ── AddressStep ───────────────────────────────────────────────────────────────

function AddressStep({
  isGuest,
  billing,
  onBilling,
  deliveryAddr,
  onDeliveryAddr,
  sameAsBilling,
  onSameAsBilling,
  onBack,
  onNext,
}: {
  isGuest: boolean
  billing: BillingAddress
  onBilling: (a: BillingAddress) => void
  deliveryAddr: DeliveryAddress
  onDeliveryAddr: (a: DeliveryAddress) => void
  sameAsBilling: boolean
  onSameAsBilling: (v: boolean) => void
  onBack: () => void
  onNext: () => void
}) {
  const { t } = useLocale()
  const tc = t.checkout
  const [error, setError] = useState<string | null>(null)

  const setB = (field: keyof BillingAddress) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onBilling({ ...billing, [field]: e.target.value })

  const setD = (field: keyof DeliveryAddress) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onDeliveryAddr({ ...deliveryAddr, [field]: e.target.value })

  const handleNext = () => {
    const billingReq: (keyof BillingAddress)[] = ['firstName', 'lastName', 'email', 'country', 'street', 'city', 'postalCode']
    for (const f of billingReq) {
      if (!billing[f].trim()) { setError(tc.fillBillingFields); return }
    }
    if (!sameAsBilling) {
      const deliveryReq: (keyof DeliveryAddress)[] = ['firstName', 'lastName', 'country', 'street', 'city', 'postalCode']
      for (const f of deliveryReq) {
        if (!deliveryAddr[f].trim()) { setError(tc.fillDeliveryFields); return }
      }
    }
    setError(null)
    onNext()
  }

  const CountrySelect = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <select value={value} onChange={onChange} className={IC}>
      <option value="AT">{tc.austria}</option>
      <option value="DE">{tc.germany}</option>
      <option value="CH">{tc.switzerland}</option>
      <option value="OTHER">{tc.other}</option>
    </select>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">{tc.billingAddress}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder={`${tc.firstName} *`} value={billing.firstName} onChange={setB('firstName')} className={IC} />
          <input type="text" placeholder={`${tc.lastName} *`} value={billing.lastName} onChange={setB('lastName')} className={IC} />
          <input type="email" placeholder={`${tc.email} *`} value={billing.email} onChange={setB('email')} className={IC} />
          <input type="tel" placeholder={tc.phone} value={billing.phone} onChange={setB('phone')} className={IC} />
          <div className="sm:col-span-2">
            <CountrySelect value={billing.country} onChange={setB('country')} />
          </div>
          <div className="sm:col-span-2">
            <input type="text" placeholder={`${tc.street} *`} value={billing.street} onChange={setB('street')} className={IC} />
          </div>
          <input type="text" placeholder={`${tc.city} *`} value={billing.city} onChange={setB('city')} className={IC} />
          <input type="text" placeholder={`${tc.zip} *`} value={billing.postalCode} onChange={setB('postalCode')} className={IC} />
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={sameAsBilling} onChange={e => onSameAsBilling(e.target.checked)} className="w-4 h-4 accent-red-600" />
        <span className="text-sm text-gray-700">{tc.sameAddress}</span>
      </label>

      {!sameAsBilling && (
        <div className="space-y-3 pt-1">
          <h3 className="text-sm font-semibold text-gray-900">{tc.deliveryAddress}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder={`${tc.firstName} *`} value={deliveryAddr.firstName} onChange={setD('firstName')} className={IC} />
            <input type="text" placeholder={`${tc.lastName} *`} value={deliveryAddr.lastName} onChange={setD('lastName')} className={IC} />
            <div className="sm:col-span-2">
              <input type="tel" placeholder={tc.phone} value={deliveryAddr.phone} onChange={setD('phone')} className={IC} />
            </div>
            <div className="sm:col-span-2">
              <CountrySelect value={deliveryAddr.country} onChange={setD('country')} />
            </div>
            <div className="sm:col-span-2">
              <input type="text" placeholder={`${tc.street} *`} value={deliveryAddr.street} onChange={setD('street')} className={IC} />
            </div>
            <input type="text" placeholder={`${tc.city} *`} value={deliveryAddr.city} onChange={setD('city')} className={IC} />
            <input type="text" placeholder={`${tc.zip} *`} value={deliveryAddr.postalCode} onChange={setD('postalCode')} className={IC} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        {isGuest ? (
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">← {tc.back}</button>
        ) : (
          <span />
        )}
        <button type="button" onClick={handleNext} className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm">
          {tc.continue} →
        </button>
      </div>
    </div>
  )
}

// ── DeliveryStep ──────────────────────────────────────────────────────────────

function DeliveryStep({
  deliveryType,
  setDeliveryType,
  deliveryPrices,
  pricesLoading,
  onBack,
  onNext,
}: {
  deliveryType: DeliveryType
  setDeliveryType: (d: DeliveryType) => void
  deliveryPrices: Record<DeliveryType, number>
  pricesLoading: boolean
  onBack: () => void
  onNext: () => void
}) {
  const { t } = useLocale()
  const tc = t.checkout

  const deliveryOptions: { value: DeliveryType; label: string; desc: string }[] = [
    { value: 'STANDARD', label: tc.standard, desc: tc.standardDesc },
    { value: 'PICKUP', label: tc.pickup, desc: tc.pickupDesc },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">{tc.deliveryMethod}</h2>

      <div className="flex flex-col gap-2">
        {deliveryOptions.map(({ value, label, desc }) => {
          const selected = deliveryType === value
          const price = deliveryPrices[value] ?? 0
          return (
            <button
              key={value}
              type="button"
              onClick={() => setDeliveryType(value)}
              className={[
                'flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm transition-colors text-left',
                selected ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <div>
                <p className={`font-medium ${selected ? 'text-gray-900' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <span className={`font-semibold shrink-0 ml-4 ${selected ? 'text-red-600' : 'text-gray-500'}`}>
                {pricesLoading ? (
                  <span className="inline-block w-10 h-4 bg-gray-100 rounded animate-pulse" />
                ) : value === 'PICKUP' || price === 0 ? tc.free : `€${price.toFixed(2)}`}
              </span>
            </button>
          )
        })}
      </div>

      {deliveryType === 'PICKUP' && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{tc.pickupNote}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">← {tc.back}</button>
        <button type="button" onClick={onNext} className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm">
          {tc.continue} →
        </button>
      </div>
    </div>
  )
}

// ── PaymentStep ───────────────────────────────────────────────────────────────

function PaymentStep({
  itemCount,
  subtotal,
  deliveryType,
  deliveryPrice,
  billing,
  deliveryAddr,
  sameAsBilling,
  onBack,
}: {
  itemCount: number
  subtotal: number
  deliveryType: DeliveryType
  deliveryPrice: number
  billing: BillingAddress
  deliveryAddr: DeliveryAddress
  sameAsBilling: boolean
  onBack: () => void
}) {
  const { t } = useLocale()
  const tc = t.checkout
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [serverTotal, setServerTotal] = useState<number | null>(null)
  const [intentError, setIntentError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setIntentError(null)
    fetch('/api/checkout/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryType }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.clientSecret) {
          setClientSecret(d.clientSecret)
          setServerTotal(d.total ?? null)
        } else {
          setIntentError(d.error ?? tc.paymentUnavailable)
        }
      })
      .catch(() => setIntentError(tc.connectionError))
      .finally(() => setLoading(false))
  }, [deliveryType]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center min-h-[220px]">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full" />
          <p className="text-sm">{tc.settingUpPayment}</p>
        </div>
      </div>
    )
  }

  if (intentError || !clientSecret || !stripePromise) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {intentError ?? tc.paymentUnavailable}
        </p>
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">
          ← {tc.backToDelivery}
        </button>
      </div>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#dc2626' } } }}
    >
      <PaymentForm
        itemCount={itemCount}
        subtotal={subtotal}
        deliveryType={deliveryType}
        deliveryPrice={deliveryPrice}
        serverTotal={serverTotal}
        billing={billing}
        deliveryAddr={deliveryAddr}
        sameAsBilling={sameAsBilling}
        onBack={onBack}
      />
    </Elements>
  )
}

function PaymentForm({
  itemCount,
  subtotal,
  deliveryType,
  serverTotal,
  billing,
  deliveryAddr,
  sameAsBilling,
  onBack,
}: {
  itemCount: number
  subtotal: number
  deliveryType: DeliveryType
  deliveryPrice: number
  serverTotal: number | null
  billing: BillingAddress
  deliveryAddr: DeliveryAddress
  sameAsBilling: boolean
  onBack: () => void
}) {
  const { t } = useLocale()
  const tc = t.checkout
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const displayTotal = serverTotal ?? subtotal

  const deliveryLabels: Record<DeliveryType, string> = {
    STANDARD: tc.standard,
    EXPRESS: 'Express',
    PICKUP: tc.pickup,
  }

  const handlePay = async () => {
    if (!stripe || !elements) return
    setPaying(true)
    setPayError(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/processing` },
      redirect: 'if_required',
    })

    if (error) {
      setPayError(error.message ?? 'Payment failed')
      setPaying(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            deliveryType,
            billing,
            deliveryAddr: sameAsBilling ? null : deliveryAddr,
            sameAsBilling,
          }),
        })
        const data = await res.json()
        if (res.ok && data.orderId) {
          sessionStorage.removeItem('checkout_wizard')
          window.location.href = `/order-success?order=${data.orderId}`
          return
        }
        setPayError(data.error ?? 'Order could not be created')
      } catch {
        setPayError(tc.connectionError)
      }
    }

    setPaying(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h2 className="text-base font-semibold text-gray-900">{tc.securePayment}</h2>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm border border-gray-100">
        <div className="flex justify-between text-gray-600 mb-1">
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''} · {deliveryLabels[deliveryType]}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 text-base">
          <span>{tc.total}</span>
          <span>€{displayTotal.toFixed(2)}</span>
        </div>
      </div>

      {payError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={paying}
          className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
        >
          ← {tc.backToDelivery}
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={!stripe || !elements || paying}
          className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? tc.processing : `${tc.pay} €${displayTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}

// ── CartSummary ───────────────────────────────────────────────────────────────

function CartSummary({
  items,
  subtotal,
  deliveryPrice,
  vatRate,
  onDeleted,
}: {
  items: CartItem[]
  subtotal: number
  deliveryPrice: number
  vatRate: number
  onDeleted: (id: string) => void
}) {
  const { t } = useLocale()
  const tc = t.checkout

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{tc.orderSummary}</p>

      <div className="space-y-3 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            <div className="w-10 h-10 rounded overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 truncate">{item.name}</p>
              {item.variant && <p className="text-xs text-gray-400 truncate">{item.variant}</p>}
              <p className="text-xs text-gray-400">{tc.qty} {item.quantity}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-medium text-gray-900">€{item.lineTotal.toFixed(2)}</span>
              <RemoveCartItemButton itemId={item.id} onRemoved={onDeleted} variant="icon" />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{tc.subtotal}</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>{tc.shipping}</span>
          <span>{deliveryPrice === 0 ? tc.free : `€${deliveryPrice.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-gray-100">
          <span>{tc.total}</span>
          <span>€{(subtotal + deliveryPrice).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>incl. {vatRate}% {tc.tax}</span>
          <span>€{((subtotal + deliveryPrice) * vatRate / (100 + vatRate)).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

// ── CheckoutWizard (root) ─────────────────────────────────────────────────────

export default function CheckoutWizard(props: Props) {
  const { isGuest } = props
  const { t } = useLocale()
  const tc = t.checkout

  const [step, setStep] = useState<Step>(isGuest ? 'account' : 'address')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('STANDARD')

  const [billing, setBilling] = useState<BillingAddress>({
    firstName: '', lastName: '', email: '', phone: '',
    country: 'AT', street: '', city: '', postalCode: '',
  })
  const [deliveryAddr, setDeliveryAddr] = useState<DeliveryAddress>({
    firstName: '', lastName: '', phone: '',
    country: 'AT', street: '', city: '', postalCode: '',
  })
  const [sameAsBilling, setSameAsBilling] = useState(true)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('checkout_wizard')
      if (!saved) return
      const d = JSON.parse(saved) as {
        step?: Step
        billing?: BillingAddress
        deliveryAddr?: DeliveryAddress
        sameAsBilling?: boolean
        deliveryType?: DeliveryType
      }
      if (d.billing) setBilling(d.billing)
      if (d.deliveryAddr) setDeliveryAddr(d.deliveryAddr)
      if (typeof d.sameAsBilling === 'boolean') setSameAsBilling(d.sameAsBilling)
      if (d.deliveryType) setDeliveryType(d.deliveryType)
      if (d.step) {
        const needsAddress = d.step === 'delivery' || d.step === 'payment'
        if (needsAddress && !isAddressValid(d.billing ?? {})) {
          setStep('address')
        } else {
          setStep(d.step === 'account' && !isGuest ? 'address' : d.step)
        }
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      sessionStorage.setItem('checkout_wizard', JSON.stringify({
        step, billing, deliveryAddr, sameAsBilling, deliveryType,
      }))
    } catch {}
  }, [step, billing, deliveryAddr, sameAsBilling, deliveryType])

  const [deliveryPrices, setDeliveryPrices] = useState<Record<DeliveryType, number>>({
    STANDARD: 5, EXPRESS: 12, PICKUP: 0,
  })
  const [pricesLoading, setPricesLoading] = useState(false)
  const [vatRate, setVatRate] = useState(19)

  useEffect(() => {
    if (step !== 'delivery') return
    setPricesLoading(true)
    const country = billing.country || 'AT'
    fetch(`/api/shipping/estimate?country=${encodeURIComponent(country)}`)
      .then((r) => r.json())
      .then((d: Partial<Record<DeliveryType, number>> & { vatRate?: number }) => {
        if (d.STANDARD !== undefined) {
          setDeliveryPrices({ STANDARD: d.STANDARD, EXPRESS: d.EXPRESS ?? 12, PICKUP: 0 })
        }
        if (d.vatRate !== undefined) setVatRate(d.vatRate)
      })
      .catch(() => {})
      .finally(() => setPricesLoading(false))
  }, [step, billing.country]) // eslint-disable-line react-hooks/exhaustive-deps

  const [items, setItems] = useState<CartItem[]>(props.cartItems)
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
  const deliveryPrice = deliveryPrices[deliveryType] ?? 0

  const handleItemDeleted = (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    if (next.length === 0) window.location.href = '/cart'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <a href="/cart" className="text-xs text-gray-400 hover:text-gray-700 mb-6 inline-flex items-center gap-1">
          ← {tc.cart}
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5">
            <StepIndicator currentStep={step} isGuest={isGuest} />

            {step === 'account' && (
              <AccountStep
                onGuest={() => setStep('address')}
                onRegisterDone={() => setStep('address')}
              />
            )}

            {step === 'address' && (
              <AddressStep
                isGuest={isGuest}
                billing={billing}
                onBilling={setBilling}
                deliveryAddr={deliveryAddr}
                onDeliveryAddr={setDeliveryAddr}
                sameAsBilling={sameAsBilling}
                onSameAsBilling={setSameAsBilling}
                onBack={() => setStep('account')}
                onNext={() => setStep('delivery')}
              />
            )}

            {step === 'delivery' && (
              <DeliveryStep
                deliveryType={deliveryType}
                setDeliveryType={setDeliveryType}
                deliveryPrices={deliveryPrices}
                pricesLoading={pricesLoading}
                onBack={() => setStep('address')}
                onNext={() => setStep('payment')}
              />
            )}

            {step === 'payment' && (
              <PaymentStep
                itemCount={items.length}
                subtotal={subtotal}
                deliveryType={deliveryType}
                deliveryPrice={deliveryPrice}
                billing={billing}
                deliveryAddr={deliveryAddr}
                sameAsBilling={sameAsBilling}
                onBack={() => setStep('delivery')}
              />
            )}
          </div>

          <CartSummary
            items={items}
            subtotal={subtotal}
            deliveryPrice={deliveryPrice}
            vatRate={vatRate}
            onDeleted={handleItemDeleted}
          />
        </div>
      </div>
    </div>
  )
}
