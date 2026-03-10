import { type Metadata } from 'next'
import Container from '@/components/Container'
import { BRANDING } from '@/config/branding'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch for custom print jobs, installation service and large-format orders.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <Container>
      <div className="max-w-2xl">

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact</h1>
        <p className="text-gray-500 mb-10">
          Custom jobs welcome. We are happy to help with special formats, textile, large-format print and graphic installation.
        </p>

        {/* Company info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Address</p>
            <div className="text-sm text-gray-700 leading-relaxed space-y-0.5">
              <p className="font-semibold text-gray-900">{BRANDING.name}</p>
              <p>Musterstraße 12</p>
              <p>12345 Berlin</p>
              <p>Germany</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</p>
            <div className="text-sm text-gray-700 space-y-1.5">
              <p>
                <span className="text-gray-400">Phone:</span>{' '}
                <a href="tel:+49123456789" className="text-gray-900 hover:text-red-600 transition-colors">
                  +49 123 456 789
                </a>
              </p>
              <p>
                <span className="text-gray-400">Email:</span>{' '}
                <a href="mailto:info@printshop.de" className="text-gray-900 hover:text-red-600 transition-colors">
                  info@printshop.de
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">We offer</p>
          <ul className="space-y-2">
            {[
              'Custom print jobs — any size, any material',
              'Large format print: banners, foil, mesh, PVC',
              'Textile print: DTF, sublimation, screen print',
              'Graphic installation: wrapping, signage, mounting',
              'Foil lettering and vinyl cut',
              'Rush production available on request',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="rounded-xl bg-gray-900 text-white p-6">
          <p className="font-semibold mb-1">Ready to order or have questions?</p>
          <p className="text-gray-400 text-sm mb-4">
            Send us an email or call — we respond within 1 business day.
          </p>
          <a
            href="mailto:info@printshop.de"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Send email →
          </a>
        </div>

      </div>
    </Container>
  )
}
