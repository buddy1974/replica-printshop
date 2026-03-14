// Graphic Design & Layout — static service info page, no configurator, no cart

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Graphic Design & Layout Service',
  description:
    'Professional design for print, advertising and branding. Flyers, brochures, posters, logos, corporate design — ready for print.',
  openGraph: {
    title: 'Graphic Design & Layout | Printshop',
    description: 'Professional design for print, advertising and branding.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Graphic Design & Layout | Printshop',
    description: 'Professional design for print, advertising and branding.',
  },
  alternates: { canonical: '/shop/graphic-design-layout' },
}

const SERVICES = [
  'Flyers',
  'Brochures',
  'Posters',
  'Business cards',
  'Banners',
  'Roll-ups',
  'Stickers',
  'Corporate design',
  'Logo design',
  'Print-ready layouts',
  'File check & correction',
  'Layout optimisation',
]

const TOOLS = [
  'Adobe InDesign',
  'Adobe Illustrator',
  'Adobe Photoshop',
  'CorelDRAW',
]

export default function GraphicDesignLayoutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-gray-900">
        <img
          src="/images/products/design-services.png"
          alt="Graphic Design & Layout Service"
          className="w-full object-cover max-h-[420px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-300 mb-2">
            Flyers · Brochures · Logos · Corporate Design · Print Layout · Prepress
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Graphic Design &amp; Layout Service
          </h1>
          <p className="mt-2 text-lg text-gray-200 font-medium">
            Professional design for print, advertising, and branding.
          </p>
        </div>
      </div>

      {/* ── Details ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Intro */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            We don&apos;t just print — we design.
          </h2>
          <p className="text-gray-600 leading-relaxed text-base">
            We design professional layouts for print and advertising.
            From simple flyers to complete corporate branding, our team works with
            industry-standard tools to deliver clean, high-quality results ready for production.
          </p>
          <p className="text-gray-600 leading-relaxed text-base">
            Whether you need a clean flyer, a modern brochure, or a complete corporate look,
            we help you create professional graphics that look perfect in print.
            Our design service includes layout, typography, colour correction, image preparation,
            and print optimisation.
          </p>
          <p className="text-gray-800 font-semibold text-base">
            Send us your idea — we turn it into a ready-to-print design.
          </p>
        </div>

        {/* Tools */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">Experts in</h3>
          <ul className="flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <li
                key={t}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">We create</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {SERVICES.map((s) => (
              <li key={s} className="flex items-center gap-2 text-gray-700 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Prepress note */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
          <p className="font-semibold text-blue-900 mb-1">Need help preparing your file?</p>
          <p className="text-sm text-blue-800 leading-relaxed">
            We also offer file check, correction, and layout optimisation.
            If your file is not print-ready, we fix it before it goes to press.
          </p>
        </div>

        {/* Contact block */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-gray-900">Request a design</p>
            <p className="text-sm text-gray-600">
              Tell us what you need — we will prepare a quote within one business day.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-block rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
          >
            Contact us
          </Link>
        </div>

        {/* Back link */}
        <div>
          <Link href="/shop" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← All products
          </Link>
        </div>
      </div>
    </div>
  )
}
