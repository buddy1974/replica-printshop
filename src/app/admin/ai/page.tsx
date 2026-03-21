import Link from 'next/link'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export default async function AdminAIPage() {
  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const td = getDictionary(locale).admin

  const stubItems = [
    { title: td.knowledgeBase,       desc: td.knowledgeBaseDesc    },
    { title: td.conversationLogs,    desc: td.conversationLogsDesc },
  ]

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{td.aiTitle}</h1>
      <p className="text-gray-500 mb-8">{td.aiSubtitle}</p>

      <div className="space-y-4">
        {/* System Prompt Override — active */}
        <div className="border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4 bg-white">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm mb-1">{td.systemPromptOverride}</h2>
            <p className="text-xs text-gray-500 leading-relaxed">{td.systemPromptDesc}</p>
          </div>
          <Link
            href="/admin/ai/system-prompt"
            className="shrink-0 text-xs font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Configure →
          </Link>
        </div>

        {/* File Analysis Rules — active */}
        <div className="border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4 bg-white">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm mb-1">{td.fileAnalysisRules}</h2>
            <p className="text-xs text-gray-500 leading-relaxed">{td.fileAnalysisDesc}</p>
          </div>
          <Link
            href="/admin/ai/rules"
            className="shrink-0 text-xs font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          >
            Configure →
          </Link>
        </div>

        {/* Remaining stubs */}
        {stubItems.map((item) => (
          <div key={item.title} className="border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4 bg-white">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold bg-gray-100 text-gray-400 px-2 py-1 rounded-full uppercase tracking-wide">
              {td.comingSoon}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-200">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">{td.currentlyActive}</strong> {td.currentlyActiveDesc}
        </p>
      </div>
    </div>
  )
}
