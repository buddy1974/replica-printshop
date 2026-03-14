'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'
import { useCart } from '@/context/CartContext'
import { useLocale } from '@/context/LocaleContext'
import { LOCALES, type Locale, type Dictionary } from '@/lib/i18n'

type NavKey = keyof Dictionary['menu']

const NAV_LINKS: { href: string; key: NavKey; mobileHide?: boolean }[] = [
  { href: '/shop', key: 'shop' },
  { href: '/shop/graphic-installation', key: 'installation', mobileHide: true },
  { href: '/shop/graphic-design-layout', key: 'design', mobileHide: true },
  { href: '/contact', key: 'contact', mobileHide: true },
  { href: '/account', key: 'account' },
  { href: '/admin', key: 'admin' },
]

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

export default function Header() {
  const pathname = usePathname()
  const { count, openDrawer } = useCart()
  const { t, locale, setLocale } = useLocale()

  return (
    <header className="sticky top-0 z-40 border-b-2 border-red-600 bg-white">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-11">
        <div className="shrink-0">
          <Logo />
        </div>
        <nav className="flex items-center gap-0 overflow-x-auto ml-3">
          {NAV_LINKS.map(({ href, key, mobileHide }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'whitespace-nowrap px-2 sm:px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
                  mobileHide ? 'hidden sm:inline-flex' : 'inline-flex',
                  active
                    ? 'text-red-600'
                    : 'text-gray-900 hover:text-red-600',
                ].join(' ')}
              >
                {t.menu[key]}
              </Link>
            )
          })}

          {/* Cart button with badge */}
          <a
            href="/cart"
            onClick={(e) => { e.preventDefault(); openDrawer() }}
            className={[
              'relative inline-flex items-center gap-1 whitespace-nowrap px-2 sm:px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
              pathname === '/cart' || pathname.startsWith('/cart/')
                ? 'text-red-600'
                : 'text-gray-900 hover:text-red-600',
            ].join(' ')}
            title="View cart"
          >
            <CartIcon />
            <span className="hidden sm:inline">{t.menu.cart}</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </a>

          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-0 border-l border-gray-200 ml-2 pl-2">
            {LOCALES.map((l: Locale, i) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={[
                  'text-[10px] font-black uppercase px-1 py-0.5 transition-colors tracking-wider',
                  locale === l ? 'text-red-600' : 'text-gray-400 hover:text-gray-900',
                ].join(' ')}
              >
                {l === 'en' ? 'EN' : l === 'de' ? 'DE' : 'FR'}
                {i < LOCALES.length - 1 && <span className="text-gray-200 ml-1">·</span>}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  )
}
