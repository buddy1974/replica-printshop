'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useLocale } from '@/context/LocaleContext'
import { type Dictionary } from '@/lib/i18n'

type NavKey = keyof Dictionary['menu']

const NAV_PATHS: { path: string; key: NavKey; mobileHide?: boolean }[] = [
  { path: '/shop', key: 'shop' },
  { path: '/shop/graphic-installation', key: 'installation', mobileHide: true },
  { path: '/shop/graphic-design-layout', key: 'design', mobileHide: true },
  { path: '/contact', key: 'contact', mobileHide: true },
]

const CMYK = ['var(--cyan)', 'var(--magenta)', 'var(--yellow)', 'var(--ink)']

function CartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  fontSize: '.78rem',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
}

export default function Header() {
  const pathname = usePathname()
  const { count, openDrawer } = useCart()
  const { t, locale } = useLocale()

  return (
    <header
      className="sticky top-0 z-50 h-16"
      style={{ background: 'var(--cream)', borderBottom: '2px solid var(--ink)' }}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-full">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)' }}>
            Print
          </span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--red)' }}>
            Shop
          </span>
          <span className="flex items-center gap-[2px] ml-1">
            {CMYK.map((bg, i) => (
              <span key={i} className="inline-block w-2 h-2 rounded-full" style={{ background: bg }} />
            ))}
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 overflow-x-auto ml-4">
          {NAV_PATHS.map(({ path, key, mobileHide }) => {
            const href = `/${locale}${path}`
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={path}
                href={href}
                className={[
                  'whitespace-nowrap px-3 py-1 transition-colors',
                  mobileHide ? 'hidden sm:inline-flex' : 'inline-flex',
                ].join(' ')}
                style={{ ...navLinkStyle, color: active ? 'var(--red)' : 'var(--ink)' }}
              >
                {t.menu[key]}
              </Link>
            )
          })}

          {/* Cart */}
          <a
            href={`/${locale}/cart`}
            onClick={(e) => { e.preventDefault(); openDrawer() }}
            className="relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 transition-colors ml-1"
            style={{ ...navLinkStyle, color: 'var(--ink)' }}
            title="View cart"
          >
            <CartIcon />
            <span className="hidden sm:inline">{t.menu.cart}</span>
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none"
                style={{ background: 'var(--red)' }}
              >
                {count > 9 ? '9+' : count}
              </span>
            )}
          </a>

          {/* Account pill */}
          <Link
            href={`/${locale}/account`}
            className="whitespace-nowrap ml-2 hidden sm:inline-flex items-center btn-pub-outline"
            style={{ padding: '.4rem 1.2rem', fontSize: '.72rem' }}
          >
            {t.menu.account}
          </Link>
        </nav>
      </div>
    </header>
  )
}
