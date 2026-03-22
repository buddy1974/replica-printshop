'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'
import type { FileRule } from '@/lib/prepressRules'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

function getClientLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const m = document.cookie.match(/(?:^|;\s*)replica_locale=([^;]*)/)
  const v = m?.[1]
  return v && LOCALES.includes(v as Locale) ? (v as Locale) : DEFAULT_LOCALE
}

export default function FileAnalysisRulesPage() {
  const [td, setTd] = useState(() => getDictionary(DEFAULT_LOCALE).admin)
  const [rules, setRules] = useState<FileRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTd(getDictionary(getClientLocale()).admin)
    fetch('/api/admin/ai/rules')
      .then((r) => r.json())
      .then((data: FileRule[]) => {
        setRules(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const update = (idx: number, field: 'minDpi' | 'bleedMm', raw: string) => {
    const num = parseInt(raw, 10)
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: isNaN(num) ? 0 : num } : r))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch('/api/admin/ai/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json() as FileRule[]
      setRules(updated)
      setSaved(true)
    } else {
      const d = await res.json()
      setError(d.error ?? td.saveFailed)
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            {td.backToAiConfig}
          </Link>
          <h1 className="mt-1">{td.fileAnalysisRules}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{td.fileAnalysisDesc}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3 pr-6">{td.colProductCategory}</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3 pr-6">{td.colMinDpi}</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-3">{td.colBleedMm}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, idx) => (
              <tr key={rule.slug} className="border-b border-gray-50 last:border-0">
                <td className="py-3 pr-6">
                  <span className="font-medium text-gray-900">{rule.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{rule.slug}</span>
                </td>
                <td className="py-3 pr-6">
                  <input
                    type="number"
                    min={1}
                    max={1200}
                    value={rule.minDpi}
                    onChange={(e) => update(idx, 'minDpi', e.target.value)}
                    className="w-24 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </td>
                <td className="py-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rule.bleedMm}
                    onChange={(e) => update(idx, 'bleedMm', e.target.value)}
                    className="w-24 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mb-4">{td.rulesHint}</p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? td.saving : td.saveSettings}
        </button>
        {saved && <span className="text-sm text-green-700">{td.savedLabel}</span>}
      </div>
    </Container>
  )
}
