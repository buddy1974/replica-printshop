import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import ProfileForm from '../ProfileForm'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const DATE_LOCALE: Record<Locale, string> = { en: 'en-GB', de: 'de-AT', fr: 'fr-FR' }

export default async function ProfilePage() {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const ta = getDictionary(locale).account

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, createdAt: true },
  })
  if (!user) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold text-gray-900">{ta.profile}</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        {/* Email — read-only (set by Google OAuth) */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{ta.email}</p>
          <p className="text-sm text-gray-800">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">{ta.emailReadOnly}</p>
        </div>

        {/* Name — editable */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">{ta.displayName}</p>
          <ProfileForm initialName={user.name ?? ''} />
        </div>

        {/* Member since */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{ta.memberSince}</p>
          <p className="text-sm text-gray-600">
            {new Date(user.createdAt).toLocaleDateString(DATE_LOCALE[locale], { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
