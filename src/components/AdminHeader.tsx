'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/production', label: 'Production' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/shipping', label: 'Shipping' },
]

export default function AdminHeader() {
  const pathname = usePathname()

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-3 h-10">
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest shrink-0">Admin</span>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {links.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
