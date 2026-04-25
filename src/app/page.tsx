import Link from 'next/link'
import { type Metadata } from 'next'
import { db } from '@/lib/db'
import { BRANDING } from '@/config/branding'
import PressQueueConsole from '@/components/PressQueueConsole'

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

const WHY_CARDS = [
  { bg: 'rgba(0,174,204,.08)',  dot: '#00AECC', cat: 'PRINT',    title: 'Colour Accuracy',    desc: 'Pantone-matched output with CMYK profiling on every job.' },
  { bg: 'rgba(204,0,102,.08)', dot: '#CC0066', cat: 'SPEED',    title: '48h Turnaround',     desc: 'Express production for time-sensitive campaigns and drops.' },
  { bg: 'rgba(255,204,0,.1)',  dot: '#FFCC00', cat: 'TECH',     title: 'File Validation',    desc: 'AI-powered prepress check catches issues before we print.' },
  { bg: 'rgba(26,18,8,.06)',   dot: '#1A1208', cat: 'MATERIAL', title: 'Any Substrate',      desc: 'Cotton, polyester, vinyl, mesh, foil — one supplier.' },
  { bg: 'rgba(0,174,204,.08)', dot: '#00AECC', cat: 'PRICE',    title: 'Bulk Pricing',       desc: 'Volume discounts from 50 units with no quality compromise.' },
  { bg: 'rgba(204,0,102,.08)', dot: '#CC0066', cat: 'STATUS',   title: 'Tracked Production', desc: 'Live job status from queue to your door.' },
]

const SERVICE_TILES = [
  { emoji: '👕', title: 'Textile',     desc: 'Screen print & embroidery on all garments',      from: '€45' },
  { emoji: '🖨️', title: 'DTF Transfer', desc: 'Direct-to-film, any design, any fabric',       from: '€12' },
  { emoji: '🏳️', title: 'Banner',      desc: 'Large format PVC, mesh and fabric',              from: '€28' },
  { emoji: '✂️', title: 'Vinyl',       desc: 'Cut and print for vehicles and signage',          from: '€18' },
  { emoji: '🎨', title: 'Sublimation', desc: 'Full-colour dye on polyester and hard goods',    from: '€32' },
  { emoji: '🖼️', title: 'Display',     desc: 'Pop-up stands, roller banners, exhibition',      from: '€85' },
  { emoji: '✨', title: 'Foil Stamp',  desc: 'Hot foil for luxury packaging and cards',         from: '€60' },
  { emoji: '🔧', title: 'Install',     desc: 'Site installation for large-format graphics',     from: 'POA' },
]

const MARQUEE_ITEMS = [
  'SAME-WEEK TURNAROUND',
  'PANTONE MATCHED COLOURS',
  'DTF · FLEX · EMBROIDERY · VINYL',
  'BULK PRICING AVAILABLE',
  'ARTWORK CHECK INCLUDED',
  'SHIPS ACROSS EUROPE',
]

const CMYK_COLORS = ['#00AECC', '#CC0066', '#FFCC00', '#1A1208']

export default async function Home() {
  const featured = await db.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    take: 4,
    select: {
      id: true, name: true, slug: true, description: true,
      variants: { take: 1, orderBy: { basePrice: 'asc' }, select: { basePrice: true } },
    },
  })

  return (
    <div>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="dot-grid-bg" style={{ padding: '6rem 2rem' }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-center">

            {/* Left */}
            <div>
              <p className="mono-label mb-5">EST. 2024 — PREMIUM PRINT STUDIO</p>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 900,
                  fontSize: 'clamp(3.5rem, 7vw, 6rem)',
                  lineHeight: .92,
                  color: 'var(--ink)',
                }}
              >
                Upload art.<br />
                <em style={{ color: 'var(--red)', fontStyle: 'italic' }}>Wear it</em><br />
                Friday.
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '1.05rem', maxWidth: 400, color: 'var(--ink-soft)', marginTop: '1.5rem', lineHeight: 1.6 }}>
                From DTF transfer to embroidery, vinyl to sublimation — your artwork, production-ready in 48 hours.
              </p>
              <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: '2rem' }}>
                <Link href="/shop" className="btn-ink">Order Now →</Link>
                <Link href="/shop/graphic-installation" className="btn-pub-outline">See Services</Link>
              </div>
              {/* CMYK readout */}
              <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '2rem' }}>
                {[
                  { label: 'C : 100', color: '#00AECC' },
                  { label: 'M : 0',   color: '#CC0066' },
                  { label: 'Y : 0',   color: '#FFCC00' },
                  { label: 'K : 20',  color: '#1A1208' },
                ].map(({ label, color }) => (
                  <span
                    key={label}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '.6rem',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      border: `1px solid ${color}`,
                      color,
                      padding: '4px 10px',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — sample print card */}
            <div
              className="relative text-center hidden lg:block"
              style={{
                background: '#E8DDD0',
                border: '2px solid var(--ink)',
                boxShadow: '5px 5px 0 var(--ink)',
                padding: '3rem 2rem',
              }}
            >
              {/* Corner badge */}
              <div
                className="absolute top-4 right-4"
                style={{
                  transform: 'rotate(-8deg)',
                  background: 'var(--red)',
                  color: '#fff',
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic',
                  fontSize: '.75rem',
                  padding: '.3rem .8rem',
                }}
              >
                PRINT READY
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '3rem', color: 'var(--red)', fontStyle: 'italic', lineHeight: 1.1 }}>
                Your Design Here
              </p>
              <p className="mono-label mt-4">SAMPLE PRINT — 300 DPI — CMYK</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                {CMYK_COLORS.map((bg, i) => (
                  <span key={i} className="inline-block w-3 h-3 rounded-full" style={{ background: bg }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. MARQUEE ──────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--ink)', padding: '14px 0', overflow: 'hidden' }}>
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#fff',
                fontSize: '.7rem',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                margin: '0 2.5rem',
              }}
            >
              {item} <span style={{ color: 'var(--red)', margin: '0 .5rem' }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. WHY US ───────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--paper-white)', padding: '6rem 2rem' }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="text-center mb-12">
            <p className="mono-label mb-3">WHY PRINTERS CHOOSE US</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: 'var(--ink)' }}>
              Craft. Speed. <em style={{ color: 'var(--red)', fontStyle: 'italic' }}>Precision.</em>
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'var(--ink)',
              border: '1px solid var(--ink)',
            }}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {WHY_CARDS.map((card) => (
              <div key={card.title} style={{ background: card.bg, padding: '2rem', position: 'relative' }}>
                <p className="mono-label mb-3">{card.cat}</p>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '.5rem' }}>
                  {card.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '.85rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                  {card.desc}
                </p>
                <span className="inline-block w-2.5 h-2.5 rounded-full mt-4" style={{ background: card.dot }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. SERVICE CATALOGUE ────────────────────────────────────────── */}
      <section className="dot-grid-bg" style={{ background: 'var(--cream)', padding: '6rem 2rem' }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="mb-12">
            <p className="mono-label mb-3">WHAT WE PRINT</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: 'var(--ink)' }}>
              Eight ways to <em style={{ color: 'var(--red)', fontStyle: 'italic' }}>make your mark.</em>
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1px',
              background: 'var(--ink)',
              border: '1px solid var(--ink)',
            }}
            className="!grid-cols-2 lg:!grid-cols-4"
          >
            {SERVICE_TILES.map((tile) => (
              <div
                key={tile.title}
                style={{ background: 'var(--cream-dark)', padding: '2rem' }}
                className="flex flex-col"
              >
                <span className="text-3xl mb-3">{tile.emoji}</span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '.4rem' }}>
                  {tile.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '.8rem', color: 'var(--ink-soft)', lineHeight: 1.55, flex: 1 }}>
                  {tile.desc}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.65rem', letterSpacing: '.08em', color: 'var(--red)', textTransform: 'uppercase' }}>
                    From {tile.from}
                  </span>
                  <Link
                    href="/shop"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--red)' }}
                    className="hover:underline"
                  >
                    Order →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PRESS QUEUE CONSOLE ──────────────────────────────────────── */}
      <section style={{ background: 'var(--paper-white)', padding: '6rem 2rem' }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="text-center mb-12">
            <p className="mono-label mb-3">LIVE PRODUCTION STATUS</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: 'var(--ink)' }}>
              Watch your job <em style={{ color: 'var(--red)', fontStyle: 'italic' }}>move through</em> the press.
            </h2>
          </div>
          <PressQueueConsole />
        </div>
      </section>

      {/* ── 6. POPULAR PRODUCTS ─────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section style={{ background: 'var(--cream-dark)', padding: '6rem 2rem' }}>
          <div className="mx-auto" style={{ maxWidth: 1200 }}>
            <div className="mb-10">
              <p className="mono-label mb-3">FROM THE CATALOGUE</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: 'var(--ink)' }}>
                Popular <em style={{ color: 'var(--red)', fontStyle: 'italic' }}>this season.</em>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((p, idx) => {
                const basePrice = p.variants[0]?.basePrice
                const priceNum = basePrice ? Number(basePrice) : null
                return (
                  <div key={p.id} className="card-ink relative" style={{ padding: '2rem' }}>
                    {/* watermark number */}
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 900,
                        fontSize: '5rem',
                        color: 'var(--red)',
                        opacity: .12,
                        position: 'absolute',
                        top: '1rem',
                        right: '1.25rem',
                        lineHeight: 1,
                        userSelect: 'none',
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '.5rem', position: 'relative' }}>
                      {p.name}
                    </h3>
                    {p.description && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '.82rem', color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: '.75rem' }}>
                        {p.description.length > 80 ? p.description.slice(0, 80) + '…' : p.description}
                      </p>
                    )}
                    {priceNum !== null && (
                      <p className="mono-label mb-4">FROM €{priceNum.toFixed(0)}</p>
                    )}
                    <Link
                      href={`/product/${p.slug}`}
                      className="btn-pub-outline"
                      style={{ padding: '.5rem 1.2rem', fontSize: '.8rem' }}
                    >
                      Configure →
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 7. DARK CTA ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--ink)',
          padding: '7rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* grain overlay */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E\")",
            pointerEvents: 'none',
          }}
        />
        <div className="mx-auto relative" style={{ maxWidth: 1100 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* Left */}
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: '3.5rem', color: '#fff', lineHeight: 1 }}>
                Ready to<br />
                <em style={{ color: 'var(--red)', fontStyle: 'italic' }}>print?</em>
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, color: 'rgba(255,255,255,.7)', fontSize: '1rem', maxWidth: 400, marginTop: '1.5rem', lineHeight: 1.6 }}>
                Get a quote in minutes. Upload your artwork, configure your print, and we&apos;ll handle the rest.
              </p>
              <Link
                href="/shop"
                className="btn-ink"
                style={{ marginTop: '2rem', background: 'var(--red)', boxShadow: '3px 3px 0 var(--cream-border)' }}
              >
                Get a Quote →
              </Link>
            </div>

            {/* Right — sample quote panel */}
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', padding: '2rem' }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.1em', fontSize: '.6rem', color: 'rgba(255,255,255,.5)', marginBottom: '1.5rem' }}>
                SAMPLE QUOTE — HOODIE ORDER
              </p>
              {[
                ['50× Hoodies — Screen Print 2-col', '€320,00'],
                ['Setup fee (1 screen)', '€45,00'],
                ['Express production (+48h)', '€40,00'],
                ['Shipping (tracked)', '€18,00'],
              ].map(([label, price]) => (
                <div key={label} className="flex justify-between" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.73rem', color: 'rgba(255,255,255,.65)', marginBottom: '.6rem' }}>
                  <span>{label}</span>
                  <span>{price}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', margin: '.75rem 0' }} />
              <div className="flex justify-between" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.73rem', color: '#fff', fontWeight: 600 }}>
                <span>TOTAL (netto zzgl. 19% MwSt.)</span>
                <span>€423,00</span>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.55rem', letterSpacing: '.06em', color: 'rgba(255,255,255,.35)', marginTop: '.75rem' }}>
                All prices excl. VAT · Prices for illustration only
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
