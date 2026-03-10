import { type Metadata } from 'next'
import Container from '@/components/Container'

export const metadata: Metadata = {
  title: 'Shipping & Delivery',
  description: 'Pickup from our workshop or shipping to your address. Production times depend on product and quantity.',
  alternates: { canonical: '/shipping' },
}

const ITEMS = [
  {
    title: 'Pickup',
    icon: '🏪',
    lines: [
      'Available for all orders',
      'Workshop address: Musterstraße 12, 12345 Berlin',
      'Opening hours: Mon–Fri 09:00–18:00',
      'No extra charge for pickup',
      'We notify you by email when your order is ready',
    ],
  },
  {
    title: 'Shipping',
    icon: '📦',
    lines: [
      'Shipping available within Germany and EU',
      'Standard shipping: 3–5 business days after production',
      'Express shipping available on request',
      'Shipping price calculated at checkout',
      'Large or bulky orders may require freight shipping',
    ],
  },
  {
    title: 'Production times',
    icon: '⚡',
    lines: [
      'Standard products: 1–3 business days',
      'Textile print (DTF, sublimation): 2–4 business days',
      'Large format banners: 1–2 business days',
      'Complex custom jobs: contact us for timeline',
      'Rush production available — contact us before ordering',
    ],
  },
  {
    title: 'Custom jobs',
    icon: '✏',
    lines: [
      'Custom jobs may require additional production time',
      'We will confirm timeline by email after order',
      'Contact us before placing large orders',
      'Installation jobs are scheduled separately',
    ],
  },
]

export default function ShippingPage() {
  return (
    <Container>
      <div className="max-w-2xl">

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipping & Delivery</h1>
        <p className="text-gray-500 mb-10">
          We offer flexible pickup and shipping options. Production time depends on the product.
        </p>

        <div className="space-y-4">
          {ITEMS.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{item.icon}</span>
                <p className="font-semibold text-gray-900">{item.title}</p>
              </div>
              <ul className="space-y-1.5">
                {item.lines.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-indigo-50 border border-indigo-100 p-5 text-sm text-indigo-800">
          Questions about delivery or timeline?{' '}
          <a href="/contact" className="font-semibold underline hover:text-indigo-600">Contact us</a> — we reply within 1 business day.
        </div>

      </div>
    </Container>
  )
}
