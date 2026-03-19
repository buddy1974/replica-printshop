import Link from 'next/link'
import Container from '@/components/Container'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export default async function NotFound() {
  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const tc = getDictionary(locale).common

  return (
    <Container>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6 py-16">
        <div className="text-7xl font-bold text-gray-100 select-none">404</div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{tc.notFound}</h1>
          <p className="text-sm text-gray-500 max-w-sm">{tc.notFoundDesc}</p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            {tc.goToShop}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
          >
            {tc.homepage}
          </Link>
        </div>
      </div>
    </Container>
  )
}
