import { type Metadata } from 'next'
import Container from '@/components/Container'

export const metadata: Metadata = {
  title: 'Payment',
  description: 'Payment options: cash on pickup, invoice or online payment.',
  alternates: { canonical: '/payment' },
}

const METHODS = [
  {
    title: 'Cash on pickup',
    icon: '💵',
    text: 'Pay when you collect your order at our workshop. Available for all orders.',
    badge: 'Available now',
  },
  {
    title: 'Invoice (B2B)',
    icon: '🧾',
    text: 'Business customers can request invoice payment. Net 14 days. Contact us before placing your order.',
    badge: 'On request',
  },
  {
    title: 'Online payment',
    icon: '💳',
    text: 'Credit card and bank transfer via secure payment provider. Coming soon for all orders.',
    badge: 'Coming soon',
  },
]

export default function PaymentPage() {
  return (
    <Container>
      <div className="max-w-2xl">

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment</h1>
        <p className="text-gray-500 mb-10">
          We offer flexible payment options for private and business customers.
        </p>

        <div className="space-y-4 mb-10">
          {METHODS.map((m) => (
            <div key={m.title} className="rounded-xl border border-gray-200 bg-white p-5 flex gap-4">
              <span className="text-2xl shrink-0">{m.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 text-sm">{m.title}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {m.badge}
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 text-sm text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-800 mb-1">Note</p>
          <p>
            All prices shown are net prices. VAT (19 %) is added at checkout where applicable.
            For large orders or custom jobs, we recommend contacting us first for a quote.
          </p>
        </div>

      </div>
    </Container>
  )
}
