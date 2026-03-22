'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'
import { useCart } from '@/context/CartContext'
import { useLocale } from '@/context/LocaleContext'
import { type Dictionary } from '@/lib/i18n'

type NavKey = keyof Dictionary['menu']

const NAV_PATHS: { path: string; key: NavKey; mobileHide?: boolean }[] = [
  { path: '/shop', key: 'shop' },
  { path: '/shop/graphic-installation', key: 'installation', mobileHide: true },
  { path: '/shop/graphic-design-layout', key: 'design', mobileHide: true },
  { path: '/contact', key: 'contact', mobileHide: true },
  { path: '/account', key: 'account' },
  { path: '/admin', key: 'admin' },
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
  const { t, locale } = useLocale()

  return (
    <header className="sticky top-0 z-40 border-b-2 border-red-600 bg-white">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-11">
        <div className="shrink-0">
          <Logo />
        </div>
        <nav className="flex items-center gap-0 overflow-x-auto ml-3">
          {NAV_PATHS.map(({ path, key, mobileHide }) => {
            const href = `/${locale}${path}`
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={path}
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
            href={`/${locale}/cart`}
            onClick={(e) => { e.preventDefault(); openDrawer() }}
            className={[
              'relative inline-flex items-center gap-1 whitespace-nowrap px-2 sm:px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
              pathname === `/${locale}/cart` || pathname.startsWith(`/${locale}/cart/`)
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


        </nav>
      </div>
    </header>
  )
}
