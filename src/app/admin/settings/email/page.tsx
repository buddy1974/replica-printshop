'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'
import { useLocale } from '@/context/LocaleContext'

interface Fields {
  'email.senderName':  string
  'email.senderEmail': string
}

const DEFAULTS: Fields = {
  'email.senderName':  'PRINTSHOP',
  'email.senderEmail': 'no-reply@printshop.com',
}

const TEMPLATES = [
  { value: 'orderCreated',    label: 'Order Created' },
  { value: 'paymentSuccess',  label: 'Payment Confirmed' },
  { value: 'uploadNeeded',    label: 'Upload Needed' },
  { value: 'fileFixRequest',  label: 'File Needs Fix' },
  { value: 'fileRejected',    label: 'File Rejected' },
  { value: 'fileApproved',    label: 'File Approved' },
  { value: 'approved',        label: 'All Files Approved' },
  { value: 'orderReady',      label: 'Order Ready' },
  { value: 'done',            label: 'Order Done' },
]

const LANGS = ['en', 'de', 'fr'] as const

export default function EmailSettingsPage() {
  const { t } = useLocale()
  const td = t.admin

  const [fields, setFields] = useState<Fields>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState(TEMPLATES[0].value)
  const [previewLang, setPreviewLang] = useState<typeof LANGS[number]>('en')
  const [previewing, setPreviewing] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setFields((prev) => {
          const next = { ...prev }
          for (const k of Object.keys(prev) as (keyof Fields)[]) {
            if (data[k] !== undefined) next[k] = data[k]
          }
          return next
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [k]: e.target.value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Save failed')
    }
  }

  const loadPreview = async () => {
    setPreviewing(true)
    setPreviewError(null)
    setPreviewHtml(null)
    setPreviewSubject(null)
    try {
      const res = await fetch(`/api/admin/email/preview?template=${previewTemplate}&lang=${previewLang}`)
      if (!res.ok) throw new Error()
      const data: { html: string; subject: string } = await res.json()
      setPreviewHtml(data.html)
      setPreviewSubject(data.subject)
    } catch {
      setPreviewError(td.emailPreviewError)
    } finally {
      setPreviewing(false)
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
          <Link href="/admin/settings" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← Settings
          </Link>
          <h1 className="mt-1">Email sender</h1>
          <p className="text-xs text-gray-400 mt-0.5">From-name and from-address for outgoing emails</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">Sender</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sender name</label>
            <input
              value={fields['email.senderName']}
              onChange={set('email.senderName')}
              placeholder="PRINTSHOP"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <p className="text-xs text-gray-400 mt-1">Displayed as the sender name in the inbox</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sender email</label>
            <input
              value={fields['email.senderEmail']}
              onChange={set('email.senderEmail')}
              type="email"
              placeholder="no-reply@printshop.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <p className="text-xs text-gray-400 mt-1">Used as From address when SMTP_FROM env var is not set</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-5 py-4 mb-6">
        <p className="text-xs font-semibold text-yellow-700 mb-1">SMTP configuration</p>
        <p className="text-xs text-yellow-600">
          Set <code className="bg-yellow-100 px-1 rounded">SMTP_HOST</code>, <code className="bg-yellow-100 px-1 rounded">SMTP_USER</code>, <code className="bg-yellow-100 px-1 rounded">SMTP_PASS</code> and <code className="bg-yellow-100 px-1 rounded">SMTP_FROM</code> environment variables to enable real email delivery.
          When <code className="bg-yellow-100 px-1 rounded">SMTP_FROM</code> is set, it overrides the sender email above.
        </p>
        <Link href="/admin/settings" className="text-xs text-yellow-700 underline mt-2 block">
          View SMTP status →
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="flex items-center gap-3 mb-10">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>

      {/* ── Template preview ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
          {td.emailPreviewSection}
        </p>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-gray-600 mb-1">{td.emailPreviewTemplate}</label>
            <select
              value={previewTemplate}
              onChange={(e) => { setPreviewTemplate(e.target.value); setPreviewHtml(null); setPreviewSubject(null) }}
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{td.emailPreviewLanguage}</label>
            <div className="flex gap-1">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => { setPreviewLang(l); setPreviewHtml(null); setPreviewSubject(null) }}
                  className={[
                    'px-3 h-9 rounded-lg text-xs font-bold transition-colors',
                    previewLang === l
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={loadPreview}
            disabled={previewing}
            className="px-5 h-9 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {previewing ? '…' : td.emailPreviewBtn}
          </button>
        </div>

        {previewError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {previewError}
          </p>
        )}

        {previewSubject && (
          <p className="text-xs text-gray-500 mb-2">
            <span className="font-semibold text-gray-700">{td.emailPreviewSubject}:</span> {previewSubject}
          </p>
        )}

        {previewHtml && (
          <iframe
            srcDoc={previewHtml}
            className="w-full rounded-xl border border-gray-200"
            style={{ height: 500 }}
            title="Email preview"
            sandbox="allow-same-origin"
          />
        )}
      </div>
    </Container>
  )
}
