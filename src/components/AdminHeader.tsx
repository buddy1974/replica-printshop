'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/production', label: 'Production' },
  { href: '/admin/shipping', label: 'Shipping' },
]

export default function AdminHeader() {
  const pathname = usePathname()

  return (
    <header style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb', padding: '0 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24, height: 44 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280' }}>
          Admin
        </span>
        <nav style={{ display: 'flex', gap: 20 }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 13,
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
