'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'

interface Props {
  name: string | null
  email: string
}

export default function AccountSidebar({ name, email }: Props) {
  const pathname = usePathname()
  const { t } = useLocale()
  const ta = t.account

  const NAV = [
    { href: '/account', label: ta.overview },
    { href: '/account/orders', label: ta.orders },
    { href: '/account/profile', label: ta.profile },
    { href: '/account/addresses', label: ta.addresses },
    { href: '/account/designs', label: ta.designs },
    { href: '/account/uploads', label: ta.uploads },
  ]

  return (
    <nav className="md:col-span-1 bg-white border border-gray-200 rounded-xl p-4 sticky top-4">
      <div className="mb-4 pb-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900 truncate">{name ?? email}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>
      </div>
      <div className="flex flex-col gap-0.5">
        {NAV.map(({ href, label }) => {
          const active = href === '/account' ? pathname === '/account' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                active
                  ? 'bg-red-50 text-red-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
