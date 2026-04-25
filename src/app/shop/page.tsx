import { type Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { CategoryName } from '@/components/TName'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse our full range of print products.',
  alternates: { canonical: '/shop' },
}

type ShopCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  _count: { products: number }
}

export default async function ShopPage() {
  let categories: ShopCategory[] = []

  try {
    categories = await db.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        _count: { select: { products: { where: { active: true } } } },
      },
    })
  } catch {
    // DB unavailable at build time — page will regenerate on first request
  }

  const visible = categories.filter((c) => c._count.products > 0)

  return (
    <div>
      {/* Page header */}
      <div className="dot-grid-bg" style={{ padding: '4rem 2rem 3rem' }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <p className="mono-label mb-3">ALL PRODUCTS — CONFIGURE &amp; ORDER</p>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              color: 'var(--ink)',
              lineHeight: .95,
            }}
          >
            The Catalogue
          </h1>
        </div>
      </div>

      {/* Category filter bar */}
      <div style={{ background: 'var(--paper-white)', borderBottom: '1px solid var(--cream-border)' }}>
        <div className="mx-auto px-8 overflow-x-auto" style={{ maxWidth: 1200 }}>
          <div className="flex items-center gap-2 py-3" style={{ whiteSpace: 'nowrap' }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '.62rem',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '.35rem .9rem',
                background: 'var(--ink)',
                color: 'var(--paper-white)',
                cursor: 'default',
              }}
            >
              ALL
            </span>
            {visible.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop/${cat.slug}`}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '.62rem',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  padding: '.35rem .9rem',
                  border: '1px solid var(--ink)',
                  color: 'var(--ink)',
                  transition: 'all .15s ease',
                }}
                className="hover:bg-[var(--ink)] hover:text-[var(--paper-white)]"
              >
                <CategoryName slug={cat.slug} fallback={cat.name} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div style={{ background: 'var(--cream)', padding: '3rem 2rem 5rem' }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          {visible.length === 0 ? (
            <p className="mono-label">No products available.</p>
          ) : (
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
              {visible.map((cat, idx) => (
                <Link
                  key={cat.id}
                  href={`/shop/${cat.slug}`}
                  className="block group"
                  style={{ background: 'var(--cream-dark)', padding: '2rem', position: 'relative', transition: 'background .15s ease' }}
                >
                  {/* Watermark number */}
                  <span
                    aria-hidden
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 900,
                      fontSize: '5rem',
                      color: 'var(--red)',
                      opacity: .1,
                      position: 'absolute',
                      top: '.75rem',
                      right: '1.25rem',
                      lineHeight: 1,
                      userSelect: 'none',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {/* Category image */}
                  {cat.imageUrl && (
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        overflow: 'hidden',
                        marginBottom: '1rem',
                        border: '1px solid var(--cream-border)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s ease' }}
                        className="group-hover:scale-105"
                      />
                    </div>
                  )}
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: 'var(--ink)',
                      marginBottom: '.4rem',
                    }}
                  >
                    <CategoryName slug={cat.slug} fallback={cat.name} />
                  </h3>
                  {cat.description && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '.8rem', color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: '.75rem' }}>
                      {cat.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="mono-label">
                      {cat._count.products} {cat._count.products === 1 ? 'product' : 'products'}
                    </p>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '.62rem',
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                        color: 'var(--red)',
                      }}
                    >
                      Browse →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Services tiles */}
          <div style={{ marginTop: '3rem' }}>
            <p className="mono-label mb-5">SERVICES</p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1px',
                background: 'var(--ink)',
                border: '1px solid var(--ink)',
              }}
            >
              {[
                { href: '/shop/graphic-installation', title: 'Graphic Installation', desc: 'Vehicle graphics, window foil, signs, banners and event graphics.' },
                { href: '/shop/graphic-design-layout', title: 'Graphic Design & Layout', desc: 'Professional layout and design for flyers, brochures, banners and logos.' },
              ].map((svc) => (
                <Link
                  key={svc.href}
                  href={svc.href}
                  style={{ background: 'var(--cream-dark)', padding: '2rem', transition: 'background .15s ease' }}
                  className="block group hover:bg-[var(--cream)]"
                >
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '.4rem' }}>
                    {svc.title}
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: '.8rem', color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: '.75rem' }}>
                    {svc.desc}
                  </p>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.62rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--red)' }}>
                    View service →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
