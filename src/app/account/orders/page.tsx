import { notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/Badge'
import { db } from '@/lib/db'
import { orderStatusLabel } from '@/lib/statusLabel'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function AccountOrdersPage() {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const ta = getDictionary(locale).account

  const orders = await db.order.findMany({
    where: { userId },
    include: { items: true, shippingMethod: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900">{ta.orders}</h1>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500">
          {ta.noOrders}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-sm text-gray-700">{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString(locale)}</p>
                  {o.shippingMethod && <p className="text-xs text-gray-500">{o.shippingMethod.name}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge label={orderStatusLabel(o.status)} statusKey={o.status} />
                  <p className="text-sm font-medium">€{Number(o.total).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{o.items.length} {o.items.length !== 1 ? ta.items : ta.item}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
