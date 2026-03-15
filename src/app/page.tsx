import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { type Metadata } from 'next'
import { db } from '@/lib/db'
import { BRANDING } from '@/config/branding'
import { SERVICES } from '@/config/services'
import { getDictionary, LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import HeroSlider from '@/components/HeroSlider'
import ServiceImage from '@/components/ServiceImage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: BRANDING.name },
  description: 'Large format, textile print, foil, banners, installation service. Fast in-house production, pickup or shipping.',
  openGraph: {
    title: BRANDING.name,
    description: 'Large format, textile print, foil, banners, installation service.',
    images: [{ url: '/frontpage-hero.png', width: 1200, alt: BRANDING.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRANDING.name,
    description: 'Large format, textile print, foil, banners, installation service.',
    images: ['/frontpage-hero.png'],
  },
  alternates: { canonical: '/' },
}

const TRUST_ICONS = ['⚡', '📦', '✓', '✏']

export default async function Home() {
  const cookieLocale = cookies().get('replica_locale')?.value as Locale | undefined
  const locale: Locale = cookieLocale && (LOCALES as string[]).includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE
  const { home: th } = getDictionary(locale)

  const featured = await db.product.findMany({
    where: { active: true, imageUrl: { not: null } },
    orderBy: { name: 'asc' },
    take: 6,
    select: { id: true, name: true, slug: true, imageUrl: true },
  })

  const trustItems = [
    { icon: TRUST_ICONS[0], ...th.trust.fast },
    { icon: TRUST_ICONS[1], ...th.trust.delivery },
    { icon: TRUST_ICONS[2], ...th.trust.quality },
    { icon: TRUST_ICONS[3], ...th.trust.custom },
  ]

  const howSteps = [
    { n: '01', ...th.how.step1 },
    { n: '02', ...th.how.step2 },
    { n: '03', ...th.how.step3 },
    { n: '04', ...th.how.step4 },
  ]

  return (
    <div>

      {/* ── 1. Hero slideshow ───────────────────────────────────────────────── */}
      <HeroSlider />

      {/* ── 2. Trust / service strip ────────────────────────────────────────── */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-7 grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Services — static config ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-gray-900">{th.services.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{th.services.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SERVICES.map((svc) => (
            <Link
              key={svc.href}
              href={svc.href}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-red-400 hover:shadow-md transition-all"
            >
              <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                <ServiceImage src={svc.image} alt={svc.name} />
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 z-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="p-3 flex-1">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{svc.name}</p>
                <p className="text-xs text-red-500 mt-2 font-medium group-hover:text-red-700">
                  {th.services.browse}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 4. Featured products row ─────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="border-t border-gray-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-14">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900">{th.products.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{th.products.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {featured.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-red-400 hover:shadow-sm transition-all"
                >
                  <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    <Image
                      src={p.imageUrl!}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
                      className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">{p.name}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 font-medium hover:border-gray-400 transition-colors"
              >
                {th.products.viewAll}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. How it works ──────────────────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-14">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900">{th.how.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{th.how.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howSteps.map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {step.n}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              {th.how.startNow}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. Custom job CTA ────────────────────────────────────────────────── */}
      <section className="bg-red-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl font-bold mb-3">{th.cta.title}</h2>
          <p className="text-red-100 text-sm leading-relaxed max-w-lg mx-auto mb-6">
            {th.cta.subtitle}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            {th.cta.button}
          </Link>
        </div>
      </section>

    </div>
  )
}
