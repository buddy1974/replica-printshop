import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import ProfileForm from './ProfileForm'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const ta = getDictionary(locale).account

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user) notFound()

  const [orderCount, addressCount] = await Promise.all([
    db.order.count({ where: { userId } }),
    db.address.count({ where: { userId } }),
  ])

  return (
    <div className="flex flex-col gap-6">
      {/* Profile card */}
      <div className="card-pad">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{ta.profile}</h2>
        <div className="mb-4 text-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{ta.email}</p>
          <p className="text-gray-800">{user.email}</p>
        </div>
        <ProfileForm initialName={user.name ?? ''} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/account/orders"
          className="card p-5 hover:border-red-200 hover:shadow-md transition-all"
        >
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{orderCount}</p>
          <p className="text-sm text-gray-500 mt-1">{orderCount !== 1 ? ta.items : ta.item}</p>
        </Link>
        <Link
          href="/account/addresses"
          className="card p-5 hover:border-red-200 hover:shadow-md transition-all"
        >
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{addressCount}</p>
          <p className="text-sm text-gray-500 mt-1">{ta.addresses}</p>
        </Link>
      </div>
    </div>
  )
}
