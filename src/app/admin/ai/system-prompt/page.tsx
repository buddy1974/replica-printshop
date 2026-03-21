'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'

export default function SystemPromptPage() {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/ai/system-prompt')
      .then((r) => r.json())
      .then((data: { value?: string }) => {
        setValue(data.value ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch('/api/admin/ai/system-prompt', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
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
          <Link href="/admin/ai" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← AI Configuration
          </Link>
          <h1 className="mt-1">System Prompt Override</h1>
          <p className="text-xs text-gray-400 mt-0.5">Prepend custom instructions to the AI system prompt</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Custom instructions</p>
        <textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          rows={10}
          placeholder="Enter custom instructions to prepend to the AI system prompt…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y min-h-[200px]"
        />
        <p className="text-xs text-gray-400 mt-2">Leave empty to use the default system prompt only. Max 10,000 characters.</p>
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
