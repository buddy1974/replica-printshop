'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'

interface Fields {
  'invoice.prefix':     string
  'invoice.nextNumber': string
  'invoice.footer':     string
}

const DEFAULTS: Fields = {
  'invoice.prefix':     'INV',
  'invoice.nextNumber': '1001',
  'invoice.footer':     'Thank you for your order',
}

export default function InvoiceSettingsPage() {
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

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          <h1 className="text-xl font-bold text-gray-900 mt-1">Invoice</h1>
          <p className="text-xs text-gray-400 mt-0.5">Invoice numbering and footer text</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">Invoice settings</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice prefix</label>
            <input
              value={fields['invoice.prefix']}
              onChange={set('invoice.prefix')}
              placeholder="INV"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <p className="text-xs text-gray-400 mt-1">e.g. INV, BILL, PS</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Next invoice number</label>
            <input
              value={fields['invoice.nextNumber']}
              onChange={set('invoice.nextNumber')}
              placeholder="1001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <p className="text-xs text-gray-400 mt-1">e.g. 1001 → invoice INV-1001</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice footer text</label>
            <textarea
              value={fields['invoice.footer']}
              onChange={set('invoice.footer')}
              rows={3}
              placeholder="Thank you for your order"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Printed at the bottom of the invoice PDF</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 mb-6">
        <p className="text-xs font-semibold text-blue-700 mb-1">Invoice format</p>
        <p className="text-xs text-blue-600">
          Invoice PDFs use the prefix and order reference. The footer text and company data from Business settings appear on all invoices.
        </p>
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
