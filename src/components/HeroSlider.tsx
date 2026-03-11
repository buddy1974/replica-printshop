'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Slide {
  id: number
  gradient: string
  eyebrow: string
  headline: string
  sub: string
  cta: { label: string; href: string }
  image: string
}

const SLIDES: Slide[] = [
  {
    id: 1,
    gradient: 'from-gray-900 via-gray-800 to-red-950',
    eyebrow: 'Large Format Print',
    headline: 'From file to finish in 1–3 days',
    sub: 'Banners, posters, signs — in-house production, pickup or shipping.',
    cta: { label: 'Shop banners', href: '/shop/banners' },
    image: '/products/banner-hero-section.png',
  },
  {
    id: 2,
    gradient: 'from-slate-900 via-gray-900 to-slate-800',
    eyebrow: 'Textile & DTF',
    headline: 'Custom prints on any fabric',
    sub: 'DTF gang sheets, flex — small run or bulk.',
    cta: { label: 'Shop textile', href: '/shop/textile' },
    image: '/products/dtf-hero-banner.png',
  },
  {
    id: 3,
    gradient: 'from-red-950 via-gray-900 to-gray-900',
    eyebrow: 'Vinyl & Foil',
    headline: 'Cut vinyl, window foil, vehicle graphics',
    sub: 'Precision plotting and professional installation by our crew.',
    cta: { label: 'Shop vinyl', href: '/shop/vinyl' },
    image: '/products/foil-adhessive-hero-banner.png',
  },
  {
    id: 4,
    gradient: 'from-gray-800 via-gray-900 to-slate-900',
    eyebrow: 'Graphic Installation',
    headline: 'Full service — design to installation',
    sub: 'Storefronts, trade show stands, office branding and more.',
    cta: { label: 'Get a quote', href: '/contact' },
    image: '/products/graphic-installation-hero.png',
  },
]

export default function HeroSlider() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setActive((i) => (i + 1) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [paused, next])

  const slide = SLIDES[active]

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: '80vh', minHeight: 480 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          className={[
            'absolute inset-0 transition-opacity duration-700',
            i === active ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
        >
          {/* Background image with gradient overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${s.image})` }}
          />
          {/* Dark gradient overlay — always on top of image */}
          <div className={`absolute inset-0 bg-gradient-to-r ${s.gradient} opacity-80`} />
        </div>
      ))}

      {/* Content overlay */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-5xl mx-auto px-6 w-full">
          <div className="max-w-xl">
            <span
              key={`eyebrow-${active}`}
              className="inline-block text-xs font-semibold tracking-widest text-red-400 uppercase mb-4 animate-fade-in"
            >
              {slide.eyebrow}
            </span>
            <h1
              key={`headline-${active}`}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4"
            >
              {slide.headline}
            </h1>
            <p
              key={`sub-${active}`}
              className="text-base text-gray-300 leading-relaxed mb-8 max-w-md"
            >
              {slide.sub}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={slide.cta.href}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors shadow-lg"
              >
                {slide.cta.label} →
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/30 bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
              >
                All products
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dot navigation */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setActive(i); setPaused(true) }}
            aria-label={`Slide ${i + 1}`}
            className={[
              'rounded-full transition-all',
              i === active
                ? 'w-6 h-2 bg-white'
                : 'w-2 h-2 bg-white/40 hover:bg-white/70',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={() => { setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length); setPaused(true) }}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => { next(); setPaused(true) }}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </button>
    </section>
  )
}
