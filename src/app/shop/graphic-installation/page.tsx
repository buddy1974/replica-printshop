// Graphic Installation — static info page, no configurator, no cart

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Graphic Installation',
  description: 'Print, montage and installation service. Car lettering, window foil, signs, lightbox, banners and event graphics — everything from one source.',
  openGraph: {
    title: 'Graphic Installation | printshop',
    description: 'Print, montage and installation service.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Graphic Installation | printshop',
    description: 'Print, montage and installation service.',
  },
  alternates: { canonical: '/shop/graphic-installation' },
}

const SERVICES = [
  'Car lettering',
  'Window foil',
  'Milchglasfolie',
  'Lochfolie',
  'Signs',
  'Lightbox',
  'Plexiglas signs',
  'Furniture montage',
  'Vinyl floor',
  'Boat lettering',
  'Truck banners',
  'Event graphics',
  'Wedding graphics',
  'Company signs',
]

export default function GraphicInstallationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-gray-900">
        <img
          src="/products/graphic-installation-hero.png"
          alt="Graphic Installation — Print, Montage, Werbetechnik"
          className="w-full object-cover max-h-[420px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-300 mb-2">
            Car Lettering · Folienmontage · Lochfolie · Window Graphics ·
            Schilder · Leuchtkasten · Plexiglas · Möbelmontage · Vinylboden ·
            Bootsbeschriftung · LKW Planen · Event &amp; Wedding Grafik
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Werbetechnik | Montage | Print
          </h1>
          <p className="mt-2 text-lg text-gray-200 font-medium">
            Print. Montage. Installation.
          </p>
        </div>
      </div>

      {/* ── Details ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Montage &amp; Werbetechnik Service
          </h2>
          <p className="text-gray-600 leading-relaxed text-base">
            We print, produce and install advertising graphics, signs, foil, banners, displays,
            plexiglass, window graphics, car lettering and event graphics.
          </p>
          <p className="text-gray-800 font-semibold text-base">
            Everything from one source.
          </p>
        </div>

        {/* ── Service list ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Our Services</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {SERVICES.map((s) => (
              <li key={s} className="flex items-center gap-2 text-gray-700 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Contact block ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-gray-900">Did not find what you need?</p>
            <p className="text-sm text-gray-600">
              Contact us for custom print &amp; installation.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-block rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors shrink-0"
          >
            Contact
          </Link>
        </div>

        {/* ── Back link ───────────────────────────────────────────────────── */}
        <div>
          <Link href="/shop" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← All products
          </Link>
        </div>
      </div>
    </div>
  )
}
