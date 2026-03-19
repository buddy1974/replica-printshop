'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin',            label: 'Dashboard',   exact: true },
  { href: '/admin/orders',     label: 'Orders' },
  { href: '/admin/production', label: 'Production' },
  { href: '/admin/products',   label: 'Products' },
  { href: '/admin/customers',  label: 'Customers' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/ai',         label: 'AI assistant' },
]

const SETTINGS_NAV = [
  { href: '/admin/settings/business', label: 'Business' },
  { href: '/admin/settings/invoice',  label: 'Invoice' },
  { href: '/admin/settings/email',    label: 'Email' },
  { href: '/admin/settings/tax',      label: 'Tax / VAT' },
  { href: '/admin/settings/shipping', label: 'Shipping' },
]

const SYSTEM_NAV = [
  { href: '/admin/backup', label: 'Backup' },
  { href: '/admin/logs',   label: 'Logs' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const onSettings = pathname.startsWith('/admin/settings')

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white min-h-screen flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-gray-100">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-red-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-black leading-none">P</span>
          </span>
          <span className="text-sm font-semibold text-gray-900 tracking-tight">Printshop</span>
        </Link>
        <p className="text-[10px] text-gray-400 mt-1 pl-8 uppercase tracking-wider font-medium">Admin</p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ href, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center px-3 h-8 rounded-lg text-sm font-medium transition-colors',
              isActive(href, exact)
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}

        {/* Settings section */}
        <div className="mt-3">
          <Link
            href="/admin/settings"
            className={[
              'flex items-center px-3 h-8 rounded-lg text-sm font-medium transition-colors',
              onSettings
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
            ].join(' ')}
          >
            Settings
          </Link>

          {onSettings && (
            <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-gray-200 pl-2">
              {SETTINGS_NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'flex items-center h-7 px-2 rounded-md text-xs font-medium transition-colors',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* System nav (bottom) */}
      <div className="px-2 py-3 border-t border-gray-100 flex flex-col gap-0.5">
        {SYSTEM_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center px-3 h-8 rounded-lg text-xs font-medium transition-colors',
              isActive(href)
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
            ].join(' ')}
          >
            {label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
