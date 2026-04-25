import Link from 'next/link'
import { getSetting } from '@/lib/settings/settingsService'

const SHOP_LINKS = [
  { href: '/shop/textile', label: 'Textile print' },
  { href: '/shop/dtf', label: 'DTF gang sheet' },
  { href: '/shop/banners', label: 'Banners' },
  { href: '/shop/vinyl', label: 'Vinyl plot' },
  { href: '/shop/sublimation', label: 'Sublimation' },
]

const SERVICE_LINKS = [
  { href: '/shop/graphic-design-layout', label: 'Graphic design' },
  { href: '/shop/graphic-installation', label: 'Installation' },
  { href: '/contact', label: 'Custom production' },
  { href: '/shipping', label: 'EU Shipping' },
]

const CMYK = ['var(--cyan)', 'var(--magenta)', 'var(--yellow)', 'var(--ink)']

export default async function Footer() {
  const [companyName, email, website] = await Promise.all([
    getSetting('company.name'),
    getSetting('company.email'),
    getSetting('company.website'),
  ])

  const domain = website ? website.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'printshop.maxpromo.digital'
  const displayEmail = email || 'info@printshop.maxpromo.digital'

  const colHead: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '.12em',
    fontSize: '.6rem',
    color: 'rgba(253,250,244,.5)',
    marginBottom: '1.25rem',
  }
  const colLink: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '.82rem',
    color: 'rgba(253,250,244,.7)',
    display: 'block',
    marginBottom: '.6rem',
    transition: 'color .15s ease',
  }

  return (
    <footer style={{ background: 'var(--ink)' }}>
      <div className="max-w-6xl mx-auto px-8" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Col 1 — Brand */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--paper-white)' }}>
                Print
              </span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--red)' }}>
                Shop
              </span>
              <span className="flex items-center gap-[2px] ml-1">
                {CMYK.map((bg, i) => (
                  <span key={i} className="inline-block w-2 h-2 rounded-full" style={{ background: bg }} />
                ))}
              </span>
            </div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.6rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(253,250,244,.4)', lineHeight: 1.7 }}>
              Custom textile, DTF, banners,<br />vinyl &amp; sublimation.<br />Small runs, big color.
            </p>
          </div>

          {/* Col 2 — Shop */}
          <div>
            <p style={colHead}>Shop</p>
            {SHOP_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={colLink} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Col 3 — Services */}
          <div>
            <p style={colHead}>Services</p>
            {SERVICE_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={colLink} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Col 4 — Contact */}
          <div>
            <p style={colHead}>Contact</p>
            <a
              href={`mailto:${displayEmail}`}
              style={{ ...colLink, fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', color: 'rgba(253,250,244,.55)' }}
              className="hover:text-white"
            >
              {displayEmail}
            </a>
            <a
              href={website?.startsWith('http') ? website : `https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...colLink, fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', color: 'rgba(253,250,244,.55)' }}
              className="hover:text-white"
            >
              {domain}
            </a>
          </div>
        </div>

        {/* CMYK dots row */}
        <div className="flex items-center justify-center gap-3 mt-10 mb-6">
          {CMYK.map((bg, i) => (
            <span key={i} className="inline-block w-3 h-3 rounded-full" style={{ background: bg }} />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
        <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.1em', fontSize: '.6rem', color: 'rgba(253,250,244,.4)' }}>
            © {new Date().getFullYear()} {companyName || 'PrintShop'} · All rights reserved
          </span>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.1em', fontSize: '.6rem', color: 'rgba(253,250,244,.3)' }}>
              Press ready · Color managed · ISO 12647
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.1em', fontSize: '.6rem', color: 'var(--red)' }}>
              Developed by Maxpromo.Digital
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
