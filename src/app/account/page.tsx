import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import ProfileForm from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

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
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Profile</h2>
        <div className="mb-4 text-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
          <p className="text-gray-800">{user.email}</p>
        </div>
        <ProfileForm initialName={user.name ?? ''} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/account/orders"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition-colors"
        >
          <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
          <p className="text-sm text-gray-500 mt-1">Order{orderCount !== 1 ? 's' : ''}</p>
        </Link>
        <Link
          href="/account/addresses"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-400 transition-colors"
        >
          <p className="text-2xl font-bold text-gray-900">{addressCount}</p>
          <p className="text-sm text-gray-500 mt-1">Saved address{addressCount !== 1 ? 'es' : ''}</p>
        </Link>
      </div>
    </div>
  )
}
