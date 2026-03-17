'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'

interface Fields {
  'email.senderName':  string
  'email.senderEmail': string
}

const DEFAULTS: Fields = {
  'email.senderName':  'PRINTSHOP',
  'email.senderEmail': 'no-reply@printshop.com',
}

export default function EmailSettingsPage() {
  const [fields, setFields] = useState<Fields>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <h1 className="text-xl font-bold text-gray-900 mt-1">Email sender</h1>
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

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>
    </Container>
  )
}
