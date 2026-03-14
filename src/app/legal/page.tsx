import { type Metadata } from 'next'
import Container from '@/components/Container'
import { COMPANY } from '@/config/company'

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Imprint, privacy policy and terms of service.',
  alternates: { canonical: '/legal' },
}

export default function LegalPage() {
  return (
    <Container>
      <div className="max-w-2xl space-y-12">

        {/* Imprint */}
        <section>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Legal</h1>

          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Imprint</h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-1">
              <p><span className="font-medium text-gray-800">Company:</span> {COMPANY.name}</p>
              <p><span className="font-medium text-gray-800">Brand:</span> {COMPANY.brand}</p>
              <p><span className="font-medium text-gray-800">Country:</span> {COMPANY.country}</p>
              <p><span className="font-medium text-gray-800">Phone:</span>{' '}
                <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="hover:text-red-600 transition-colors">{COMPANY.phone}</a>
              </p>
              <p><span className="font-medium text-gray-800">Email:</span>{' '}
                <a href={`mailto:${COMPANY.email}`} className="hover:text-red-600 transition-colors">{COMPANY.email}</a>
              </p>
              <p><span className="font-medium text-gray-800">VAT ID:</span> DE — (to be added)</p>
              <p><span className="font-medium text-gray-800">Register:</span> — (to be added)</p>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Privacy Policy</h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              <p>
                We collect only the personal data necessary to process your order (name, address, email,
                phone number). Your data is stored securely and never sold to third parties.
              </p>
              <p>
                We use cookies for session management and basic analytics. No tracking cookies from
                third-party ad networks are used.
              </p>
              <p>
                You have the right to access, correct or delete your personal data at any time.
                Contact us at {COMPANY.email} for any data requests.
              </p>
              <p className="text-gray-400 italic text-xs">
                This is a placeholder privacy policy. A full GDPR-compliant privacy policy will be added before launch.
              </p>
            </div>
          </div>
        </section>

        {/* Terms */}
        <section>
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Terms of Service</h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              <p>
                By placing an order you confirm that you have the rights to reproduce any uploaded
                artwork, logos or images. We are not responsible for copyright infringement by customers.
              </p>
              <p>
                All orders are final after production begins. Cancellations must be requested before
                production starts. Custom jobs are non-refundable once started.
              </p>
              <p>
                Prices are subject to change without notice. The price displayed at order time is final
                for that order.
              </p>
              <p>
                Production time is an estimate and may vary. We are not liable for delays caused by
                supply chain issues or force majeure.
              </p>
              <p className="text-gray-400 italic text-xs">
                This is a placeholder Terms of Service. Full legal terms will be added before launch.
              </p>
            </div>
          </div>
        </section>

      </div>
    </Container>
  )
}
