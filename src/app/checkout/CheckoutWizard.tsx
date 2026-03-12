'use client'

import { useState } from 'react'

interface CartItem {
  id: string
  name: string
  variant: string | null
  width: number
  height: number
  quantity: number
  lineTotal: number
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

const DELIVERY_OPTIONS: { value: DeliveryType; label: string; desc: string }[] = [
  { value: 'STANDARD', label: 'Standard', desc: '3–5 business days' },
  { value: 'EXPRESS', label: 'Express', desc: '1–2 business days' },
  { value: 'PICKUP', label: 'Pickup', desc: 'Collect in store' },
]

const STEPS: { key: Step; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'address', label: 'Address' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
]

const STEP_ORDER: Step[] = ['account', 'address', 'delivery', 'payment']

function stepIndex(s: Step) {
  return STEP_ORDER.indexOf(s)
}

// ── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep, isGuest }: { currentStep: Step; isGuest: boolean }) {
  const current = stepIndex(currentStep)

  return (
    <div className="flex items-start justify-between mb-2">
      {STEPS.map(({ key, label }, idx) => {
        const isSkipped = key === 'account' && !isGuest
        const isDone = isSkipped || idx < current
        const isActive = idx === current && !isSkipped

        return (
          <div key={key} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {/* Left connector */}
              <div className={`flex-1 h-px ${idx === 0 ? 'opacity-0' : isDone || isActive ? 'bg-red-600' : 'bg-gray-200'}`} />

              {/* Circle */}
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                  isDone
                    ? 'bg-red-600 text-white'
                    : isActive
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-500',
                ].join(' ')}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              {/* Right connector */}
              <div className={`flex-1 h-px ${idx === STEPS.length - 1 ? 'opacity-0' : isDone ? 'bg-red-600' : 'bg-gray-200'}`} />
            </div>

            <span
              className={[
                'text-xs mt-1.5',
                isActive ? 'text-red-600 font-semibold' : isDone ? 'text-red-500' : 'text-gray-400',
              ].join(' ')}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── AccountStep ──────────────────────────────────────────────────────────────

function AccountStep({ onGuest, onRegisterDone }: { onGuest: () => void; onRegisterDone: () => void }) {
  const [mode, setMode] = useState<'choose' | 'register'>('choose')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regError, setRegError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  const handleRegister = async () => {
    setRegLoading(true)
    setRegError(null)
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim() }),
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
        <h2 className="text-base font-semibold text-gray-900">Create account</h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={regName}
            onChange={e => setRegName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <input
            type="email"
            placeholder="Email address"
            value={regEmail}
            onChange={e => setRegEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {regError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{regError}</p>
        )}

        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleRegister}
            disabled={regLoading || !regName.trim() || !regEmail.trim()}
            className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {regLoading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
      <h2 className="text-base font-semibold text-gray-900 mb-1">How do you want to continue?</h2>

      {/* Continue as guest */}
      <button
        type="button"
        onClick={onGuest}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors cursor-pointer"
      >
        <span className="text-lg">🛍️</span>
        <div>
          <p className="text-sm font-medium text-gray-900">Continue as guest</p>
          <p className="text-xs text-gray-500">No account needed</p>
        </div>
      </button>

      {/* Sign in with Google */}
      <a
        href="/login"
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors"
      >
        <span className="text-lg">🔑</span>
        <div>
          <p className="text-sm font-medium text-gray-900">Sign in with Google</p>
          <p className="text-xs text-gray-500">Use your existing account</p>
        </div>
      </a>

      {/* Create account */}
      <button
        type="button"
        onClick={() => setMode('register')}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors cursor-pointer"
      >
        <span className="text-lg">✉️</span>
        <div>
          <p className="text-sm font-medium text-gray-900">Create account</p>
          <p className="text-xs text-gray-500">Register with email</p>
        </div>
      </button>
    </div>
  )
}

// ── AddressStep ──────────────────────────────────────────────────────────────

interface Address {
  fullName: string
  email: string
  phone: string
  country: string
  street1: string
  street2: string
  city: string
  postalCode: string
}

function AddressStep({
  isGuest,
  address,
  onChange,
  onBack,
  onNext,
}: {
  isGuest: boolean
  address: Address
  onChange: (a: Address) => void
  onBack: () => void
  onNext: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...address, [field]: e.target.value })

  const handleNext = () => {
    const required: (keyof Address)[] = ['fullName', 'email', 'country', 'street1', 'city', 'postalCode']
    for (const f of required) {
      if (!address[f].trim()) {
        setError('Please fill in all required fields.')
        return
      }
    }
    setError(null)
    onNext()
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Delivery address</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <input type="text" placeholder="Full name *" value={address.fullName} onChange={set('fullName')} className={inputClass} />
        </div>
        <input type="email" placeholder="Email address *" value={address.email} onChange={set('email')} className={inputClass} />
        <input type="tel" placeholder="Phone (optional)" value={address.phone} onChange={set('phone')} className={inputClass} />
        <div className="sm:col-span-2">
          <select value={address.country} onChange={set('country')} className={inputClass}>
            <option value="AT">Austria</option>
            <option value="DE">Germany</option>
            <option value="CH">Switzerland</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <input type="text" placeholder="Address line 1 *" value={address.street1} onChange={set('street1')} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <input type="text" placeholder="Apartment, suite… (optional)" value={address.street2} onChange={set('street2')} className={inputClass} />
        </div>
        <input type="text" placeholder="City *" value={address.city} onChange={set('city')} className={inputClass} />
        <input type="text" placeholder="Postal code *" value={address.postalCode} onChange={set('postalCode')} className={inputClass} />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        {isGuest ? (
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleNext}
          className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ── DeliveryStep ─────────────────────────────────────────────────────────────

function DeliveryStep({
  delivery,
  setDelivery,
  onBack,
  onNext,
}: {
  delivery: DeliveryType
  setDelivery: (d: DeliveryType) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Delivery method</h2>

      <div className="flex flex-col gap-2">
        {DELIVERY_OPTIONS.map(({ value, label, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDelivery(value)}
            className={[
              'flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors',
              delivery === value
                ? 'border-red-600 bg-red-50 text-gray-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            <span className="font-medium">{label}</span>
            <span className={delivery === value ? 'text-red-600 text-xs' : 'text-gray-400 text-xs'}>{desc}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ── PaymentStep ──────────────────────────────────────────────────────────────

function PaymentStep({
  cartItems,
  subtotal,
  delivery,
  onBack,
}: {
  cartItems: CartItem[]
  subtotal: number
  delivery: DeliveryType
  onBack: () => void
}) {
  const deliveryLabel = DELIVERY_OPTIONS.find(o => o.value === delivery)?.label ?? delivery

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h2 className="text-base font-semibold text-gray-900">Secure payment</h2>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 text-sm text-gray-500 text-center">
        Payment integration coming in Phase 3
      </div>

      <div className="bg-gray-50 rounded-lg px-4 py-4 space-y-2 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Delivery</span>
          <span>{deliveryLabel}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">
          ← Back to delivery
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="bg-gray-300 text-gray-500 px-5 py-2.5 rounded-lg font-medium cursor-not-allowed text-sm"
        >
          Place Order
        </button>
      </div>
    </div>
  )
}

// ── CartSummary ──────────────────────────────────────────────────────────────

function CartSummary({ cartItems, subtotal }: { cartItems: CartItem[]; subtotal: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Order summary</p>
      <div className="space-y-2 mb-4">
        {cartItems.map(item => (
          <div key={item.id} className="flex justify-between items-start gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 truncate">{item.name}</p>
              {item.variant && <p className="text-xs text-gray-400 truncate">{item.variant}</p>}
              <p className="text-xs text-gray-400">Qty {item.quantity}</p>
            </div>
            <span className="text-gray-900 shrink-0 font-medium">€{item.lineTotal.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-400 text-xs">
          <span>Shipping</span>
          <span>Calculated at order</span>
        </div>
      </div>
    </div>
  )
}

// ── CheckoutWizard ───────────────────────────────────────────────────────────

export default function CheckoutWizard(props: Props) {
  const { isGuest, cartItems, subtotal } = props
  const [step, setStep] = useState<Step>(isGuest ? 'account' : 'address')
  const [delivery, setDelivery] = useState<DeliveryType>('STANDARD')
  const [address, setAddress] = useState<Address>({
    fullName: '',
    email: '',
    phone: '',
    country: 'AT',
    street1: '',
    street2: '',
    city: '',
    postalCode: '',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <a href="/cart" className="text-xs text-gray-400 hover:text-gray-700 mb-6 inline-flex items-center gap-1">
          ← Cart
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left — wizard */}
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
                address={address}
                onChange={setAddress}
                onBack={() => setStep('account')}
                onNext={() => setStep('delivery')}
              />
            )}

            {step === 'delivery' && (
              <DeliveryStep
                delivery={delivery}
                setDelivery={setDelivery}
                onBack={() => setStep('address')}
                onNext={() => setStep('payment')}
              />
            )}

            {step === 'payment' && (
              <PaymentStep
                cartItems={cartItems}
                subtotal={subtotal}
                delivery={delivery}
                onBack={() => setStep('delivery')}
              />
            )}
          </div>

          {/* Right — cart summary */}
          <CartSummary cartItems={cartItems} subtotal={subtotal} />
        </div>
      </div>
    </div>
  )
}
