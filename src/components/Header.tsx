'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'

const links = [
  { href: '/shop', label: 'Shop' },
  { href: '/orders', label: 'Orders' },
  { href: '/admin', label: 'Admin' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <Logo />
        <nav style={{ display: 'flex', gap: 24 }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 14,
                textDecoration: 'none',
                color: '#374151',
                fontWeight: pathname.startsWith(href) ? 700 : 400,
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
