'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'

const links: { href: string; label: string; mobileHide?: boolean }[] = [
  { href: '/shop', label: 'Shop' },
  { href: '/shop/graphic-installation', label: 'Graphic Installation', mobileHide: true },
  { href: '/contact', label: 'Contact', mobileHide: true },
  { href: '/cart', label: 'Cart' },
  { href: '/orders', label: 'Orders' },
  { href: '/admin', label: 'Admin' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="shrink-0">
          <Logo />
        </div>
        <nav className="flex items-center gap-0.5 overflow-x-auto ml-2">
          {links.map(({ href, label, mobileHide }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-sm transition-colors',
                  mobileHide ? 'hidden sm:inline-flex' : 'inline-flex',
                  active
                    ? 'text-red-600 font-semibold bg-red-50'
                    : 'text-gray-600 font-medium hover:text-gray-900 hover:bg-gray-100',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
