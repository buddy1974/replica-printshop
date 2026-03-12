'use client'

import { useState, useEffect } from 'react'

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

const DELIVERY_OPTIONS: { value: DeliveryType; label: string; desc: string; price: number }[] = [
  { value: 'STANDARD', label: 'Standard shipping', desc: '3–5 business days', price: 5 },
  { value: 'EXPRESS', label: 'Express shipping', desc: '1–2 business days', price: 12 },
  { value: 'PICKUP', label: 'Pickup', desc: 'Collect in store', price: 0 },
]

const STEPS: { key: Step; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'address', label: 'Address' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
]

const STEP_ORDER: Step[] = ['account', 'address', 'delivery', 'payment']

const IC = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

function stepIndex(s: Step) { return STEP_ORDER.indexOf(s) }

function isAddressValid(b: Partial<BillingAddress>): boolean {
  const req: (keyof BillingAddress)[] = ['firstName', 'lastName', 'email', 'country', 'street', 'city', 'postalCode']
  return req.every(f => (b[f] ?? '').trim().length > 0)
}

// ── StepIndicator ─────────────────────────────────────────────────────────────

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
          <h2 className="text-base font-semibold text-gray-900">Create account</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create account for faster future orders</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="First name" value={regFirstName} onChange={e => setRegFirstName(e.target.value)} className={IC} />
          <input type="text" placeholder="Last name" value={regLastName} onChange={e => setRegLastName(e.target.value)} className={IC} />
          <div className="col-span-2">
            <input type="email" placeholder="Email address" value={regEmail} onChange={e => setRegEmail(e.target.value)} className={IC} />
          </div>
          <div className="col-span-2">
            <input type="password" placeholder="Password *" value={regPassword} onChange={e => setRegPassword(e.target.value)} className={IC} />
          </div>
        </div>
        {regError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{regError}</p>
        )}
        <div className="flex items-center gap-4 pt-1">
          <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-500 hover:text-gray-700 underline">
            ← Back
          </button>
          <button
            type="button"
            onClick={handleRegister}
            disabled={regLoading || !regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword}
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

      <button
        type="button"
        onClick={onGuest}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors"
      >
        <span className="text-lg">🛍️</span>
        <div>
          <p className="text-sm font-medium text-gray-900">Continue as guest</p>
          <p className="text-xs text-gray-500">Guest checkout — your data will not be saved</p>
        </div>
      </button>

      {/* Direct OAuth link — carries returnTo=/checkout so after login we land back here */}
      <a
        href="/api/auth/google?returnTo=/checkout"
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors"
      >
        <span className="text-lg">🔑</span>
        <div>
          <p className="text-sm font-medium text-gray-900">Sign in with Google</p>
          <p className="text-xs text-gray-500">Sign in with Google for quick checkout</p>
        </div>
      </a>

      <button
        type="button"
        onClick={() => setMode('register')}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-4 text-left hover:border-gray-400 transition-colors"
      >
        <span className="text-lg">✉️</span>
        <div>
          <p className="text-sm font-medium text-gray-900">Create account</p>
          <p className="text-xs text-gray-500">Create account for faster future orders</p>
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
      if (!billing[f].trim()) {
        setError('Please fill in all required billing fields.')
        return
      }
    }
    if (!sameAsBilling) {
      const deliveryReq: (keyof DeliveryAddress)[] = ['firstName', 'lastName', 'country', 'street', 'city', 'postalCode']
      for (const f of deliveryReq) {
        if (!deliveryAddr[f].trim()) {
          setError('Please fill in all required delivery fields.')
          return
        }
      }
    }
    setError(null)
    onNext()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

      {/* Billing address */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Billing address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="First name *" value={billing.firstName} onChange={setB('firstName')} className={IC} />
          <input type="text" placeholder="Last name *" value={billing.lastName} onChange={setB('lastName')} className={IC} />
          <input type="email" placeholder="Email address *" value={billing.email} onChange={setB('email')} className={IC} />
          <input type="tel" placeholder="Phone (optional)" value={billing.phone} onChange={setB('phone')} className={IC} />
          <div className="sm:col-span-2">
            <select value={billing.country} onChange={setB('country')} className={IC}>
              <option value="AT">Austria</option>
              <option value="DE">Germany</option>
              <option value="CH">Switzerland</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <input type="text" placeholder="Street address *" value={billing.street} onChange={setB('street')} className={IC} />
          </div>
          <input type="text" placeholder="City *" value={billing.city} onChange={setB('city')} className={IC} />
          <input type="text" placeholder="Postal code *" value={billing.postalCode} onChange={setB('postalCode')} className={IC} />
        </div>
      </div>

      {/* Same as billing checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sameAsBilling}
          onChange={e => onSameAsBilling(e.target.checked)}
          className="w-4 h-4 accent-red-600"
        />
        <span className="text-sm text-gray-700">Delivery address same as billing</span>
      </label>

      {/* Delivery address — shown when different */}
      {!sameAsBilling && (
        <div className="space-y-3 pt-1">
          <h3 className="text-sm font-semibold text-gray-900">Delivery address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="First name *" value={deliveryAddr.firstName} onChange={setD('firstName')} className={IC} />
            <input type="text" placeholder="Last name *" value={deliveryAddr.lastName} onChange={setD('lastName')} className={IC} />
            <div className="sm:col-span-2">
              <input type="tel" placeholder="Phone (optional)" value={deliveryAddr.phone} onChange={setD('phone')} className={IC} />
            </div>
            <div className="sm:col-span-2">
              <select value={deliveryAddr.country} onChange={setD('country')} className={IC}>
                <option value="AT">Austria</option>
                <option value="DE">Germany</option>
                <option value="CH">Switzerland</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <input type="text" placeholder="Street address *" value={deliveryAddr.street} onChange={setD('street')} className={IC} />
            </div>
            <input type="text" placeholder="City *" value={deliveryAddr.city} onChange={setD('city')} className={IC} />
            <input type="text" placeholder="Postal code *" value={deliveryAddr.postalCode} onChange={setD('postalCode')} className={IC} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        {isGuest ? (
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">← Back</button>
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

// ── DeliveryStep ──────────────────────────────────────────────────────────────

function DeliveryStep({
  deliveryType,
  setDeliveryType,
  onBack,
  onNext,
}: {
  deliveryType: DeliveryType
  setDeliveryType: (d: DeliveryType) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Delivery method</h2>

      <div className="flex flex-col gap-2">
        {DELIVERY_OPTIONS.map(({ value, label, desc, price }) => {
          const selected = deliveryType === value
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
                {price === 0 ? 'Free' : `€${price.toFixed(2)}`}
              </span>
            </button>
          )
        })}
      </div>

      {deliveryType === 'PICKUP' && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          No shipping address required — you will collect your order in store.
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">← Back</button>
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

// ── PaymentStep ───────────────────────────────────────────────────────────────

function PaymentStep({
  itemCount,
  subtotal,
  deliveryType,
  deliveryPrice,
  onBack,
}: {
  itemCount: number
  subtotal: number
  deliveryType: DeliveryType
  deliveryPrice: number
  onBack: () => void
}) {
  const deliveryOption = DELIVERY_OPTIONS.find(o => o.value === deliveryType) ?? DELIVERY_OPTIONS[0]

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
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>{deliveryOption.label}</span>
          <span>{deliveryPrice === 0 ? 'Free' : `€${deliveryPrice.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>€{(subtotal + deliveryPrice).toFixed(2)}</span>
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

// ── CartSummary ───────────────────────────────────────────────────────────────

function CartSummary({
  items,
  subtotal,
  deliveryPrice,
  onDeleted,
}: {
  items: CartItem[]
  subtotal: number
  deliveryPrice: number
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/cart/item/${id}`, { method: 'DELETE' })
      if (res.ok) onDeleted(id)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Order summary</p>

      <div className="space-y-3 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            {/* Thumbnail — design preview or product image */}
            <div className="w-10 h-10 rounded overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-gray-900 truncate">{item.name}</p>
              {item.variant && <p className="text-xs text-gray-400 truncate">{item.variant}</p>}
              <p className="text-xs text-gray-400">Qty {item.quantity}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-medium text-gray-900">€{item.lineTotal.toFixed(2)}</span>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                title="Remove item"
                className="w-5 h-5 flex items-center justify-center rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                {deleting === item.id ? (
                  <span className="text-xs leading-none">…</span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Delivery</span>
          <span>{deliveryPrice === 0 ? 'Free' : `€${deliveryPrice.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-gray-100">
          <span>Total</span>
          <span>€{(subtotal + deliveryPrice).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

// ── CheckoutWizard (root) ─────────────────────────────────────────────────────

export default function CheckoutWizard(props: Props) {
  const { isGuest } = props

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

  // Restore wizard state from sessionStorage on mount (survives page refresh)
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
        // Guard: delivery/payment require a valid address — fall back if missing
        const needsAddress = d.step === 'delivery' || d.step === 'payment'
        if (needsAddress && !isAddressValid(d.billing ?? {})) {
          setStep('address')
        } else {
          setStep(d.step === 'account' && !isGuest ? 'address' : d.step)
        }
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist wizard state to sessionStorage on every relevant change
  useEffect(() => {
    try {
      sessionStorage.setItem('checkout_wizard', JSON.stringify({
        step, billing, deliveryAddr, sameAsBilling, deliveryType,
      }))
    } catch {}
  }, [step, billing, deliveryAddr, sameAsBilling, deliveryType])

  // Items in local state so cart edits (delete) update the summary live
  const [items, setItems] = useState<CartItem[]>(props.cartItems)
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
  const deliveryPrice = DELIVERY_OPTIONS.find(o => o.value === deliveryType)?.price ?? 0

  const handleItemDeleted = (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    if (next.length === 0) window.location.href = '/cart'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <a href="/cart" className="text-xs text-gray-400 hover:text-gray-700 mb-6 inline-flex items-center gap-1">
          ← Cart
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left — wizard steps */}
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
                onBack={() => setStep('delivery')}
              />
            )}
          </div>

          {/* Right — editable cart summary */}
          <CartSummary
            items={items}
            subtotal={subtotal}
            deliveryPrice={deliveryPrice}
            onDeleted={handleItemDeleted}
          />

        </div>
      </div>
    </div>
  )
}
