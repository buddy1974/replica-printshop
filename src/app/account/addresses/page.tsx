import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import DeleteAddressButton from './DeleteAddressButton'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function AddressesPage() {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const ta = getDictionary(locale).account

  const addresses = await db.address.findMany({
    where: { userId },
    orderBy: { id: 'asc' },
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900">{ta.savedAddresses}</h1>

      {addresses.length === 0 ? (
        <div className="card p-6 text-sm text-gray-400 text-center">
          {ta.noAddresses}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((a) => (
            <div key={a.id} className="card p-4 flex justify-between items-start gap-4">
              <div className="text-sm text-gray-700 leading-relaxed">
                {a.company && <p className="font-medium">{a.company}</p>}
                <p>{a.name}</p>
                <p>{a.street}</p>
                <p>{a.zip} {a.city}</p>
                <p className="text-gray-500">{a.country}</p>
                {a.phone && <p className="text-gray-400 text-xs mt-0.5">{a.phone}</p>}
              </div>
              <DeleteAddressButton id={a.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
