import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import AccountSidebar from './AccountSidebar'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) redirect('/login')

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (!user || user.email.startsWith('guest_')) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <AccountSidebar name={user.name} email={user.email} />
          <div className="md:col-span-3">{children}</div>
        </div>
      </div>
    </div>
  )
}
