'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/production', label: 'Production' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/settings', label: 'Settings' },
]

const MORE = [
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/shipping', label: 'Shipping' },
  { href: '/admin/tax', label: 'Tax / VAT' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-48 shrink-0 border-r border-gray-200 bg-gray-50 min-h-screen flex flex-col py-6 px-3 gap-0.5">
      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-2 mb-3">Admin</p>

      {NAV.map(({ href, label, exact }) => (
        <Link
          key={href}
          href={href}
          className={[
            'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive(href, exact)
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-900 hover:bg-white',
          ].join(' ')}
        >
          {label}
        </Link>
      ))}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider px-2 mb-2">More</p>
        {MORE.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isActive(href)
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-400 hover:text-gray-700 hover:bg-white',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
