import Link from 'next/link'
import Container from '@/components/Container'
import { COMPANY } from '@/config/company'

// Read env vars server-side — never expose secrets to client
const SMTP_VARS = [
  { key: 'SMTP_HOST',   label: 'SMTP Host',     value: process.env.SMTP_HOST,   example: 'smtp.mailgun.org' },
  { key: 'SMTP_PORT',   label: 'SMTP Port',     value: process.env.SMTP_PORT,   example: '587' },
  { key: 'SMTP_USER',   label: 'SMTP User',     value: process.env.SMTP_USER,   secret: true },
  { key: 'SMTP_PASS',   label: 'SMTP Password', value: process.env.SMTP_PASS,   secret: true },
  { key: 'SMTP_FROM',   label: 'From address',  value: process.env.SMTP_FROM,   example: 'noreply@printshop.com' },
  { key: 'ADMIN_EMAIL', label: 'Admin email',   value: process.env.ADMIN_EMAIL, example: COMPANY.email },
]

function mask(v: string): string {
  if (v.length <= 4) return '••••'
  return v.slice(0, 2) + '••••' + v.slice(-2)
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-green-500' : 'bg-red-400'}`} />
  )
}

const configured = SMTP_VARS.slice(0, 4).every((v) => Boolean(v.value))

// ── Settings sections ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    href:        '/admin/settings/business',
    title:       'Business',
    description: 'Company name, address, phone, email, VAT number, currency',
    icon:        '🏢',
  },
  {
    href:        '/admin/settings/invoice',
    title:       'Invoice',
    description: 'Invoice prefix, number sequence, footer text',
    icon:        '🧾',
  },
  {
    href:        '/admin/settings/email',
    title:       'Email sender',
    description: 'Sender name and from-address for outgoing emails',
    icon:        '✉️',
  },
  {
    href:        '/admin/settings/tax',
    title:       'Tax / VAT',
    description: 'Manage tax rates by country',
    icon:        '📊',
  },
  {
    href:        '/admin/settings/shipping',
    title:       'Shipping',
    description: 'Shipping rules, methods and free-shipping thresholds',
    icon:        '📦',
  },
  {
    href:        '/admin/settings/branding',
    title:       'Branding',
    description: 'Logo URL, favicon URL, footer text, primary color',
    icon:        '🎨',
  },
]

export default function SettingsPage() {
  return (
    <Container>
      <div className="mb-6">
        <h1>Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configure business, invoice, email, tax and shipping</p>
      </div>

      {/* Settings sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {SECTIONS.map(({ href, title, description, icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{icon}</span>
              <p className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{title}</p>
            </div>
            <p className="text-xs text-gray-500">{description}</p>
          </Link>
        ))}
      </div>

      {/* SMTP status */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Email / SMTP</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${configured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {configured ? 'Configured' : 'Not configured'}
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SMTP_VARS.map(({ key, label, value, secret, example }) => {
                const set = Boolean(value)
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{label}</p>
                      <p className="font-mono text-[11px] text-gray-400">{key}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot ok={set} />
                        <span className="text-xs text-gray-500">{set ? 'Set' : 'Not set'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {set
                        ? (secret ? mask(value!) : value)
                        : <span className="text-gray-300 italic">e.g. {example}</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-gray-800">How to configure SMTP</p>
          <p>Set these environment variables in your hosting provider (Vercel → Project Settings → Environment Variables) or in your <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">.env</code> file for local development.</p>
          <p>Changes take effect after redeployment. Emails gracefully fall back to console logging if SMTP is not configured.</p>
        </div>
      </section>

      {/* Email triggers reference */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Email triggers</h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Includes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {[
                ['Order placed',          'Customer',    'Order summary + invoice PDF'],
                ['Payment confirmed',      'Customer',    'Payment confirmation + invoice PDF'],
                ['Upload needed',          'Customer',    'Upload link'],
                ['File rejected/needs fix','Customer',    'Filename + admin note'],
                ['File approved',          'Customer',    'File name'],
                ['All files approved',     'Customer',    'Production queue notice'],
                ['In production',          'Customer',    'Status update'],
                ['Order ready',            'Customer',    'Pickup / shipping notice'],
                ['Order done',             'Customer',    'Completion notice'],
                ['New order',              'Admin email', 'Order ID + total'],
                ['Contact form submitted', 'Admin email', 'Form contents + auto-reply to sender'],
              ].map(([event, recipient, includes]) => (
                <tr key={event} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{event}</td>
                  <td className="px-4 py-2.5 text-gray-500">{recipient}</td>
                  <td className="px-4 py-2.5 text-gray-500">{includes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Container>
  )
}
