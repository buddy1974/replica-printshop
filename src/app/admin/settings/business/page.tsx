'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'

interface Fields {
  'company.name':      string
  'company.street':    string
  'company.zip':       string
  'company.city':      string
  'company.country':   string
  'company.phone':     string
  'company.email':     string
  'company.website':   string
  'company.vatNumber': string
  'company.currency':  string
}

const DEFAULTS: Fields = {
  'company.name':      'PRINTSHOP',
  'company.street':    'Street 1',
  'company.zip':       '00000',
  'company.city':      'City',
  'company.country':   'Country',
  'company.phone':     '+000000000',
  'company.email':     'info@printshop.com',
  'company.website':   '',
  'company.vatNumber': '',
  'company.currency':  'EUR',
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK']

export default function BusinessSettingsPage() {
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

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          <h1 className="mt-1">Business</h1>
          <p className="text-xs text-gray-400 mt-0.5">Company info, currency</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">Company</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Company name</label>
            <input
              value={fields['company.name']}
              onChange={set('company.name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Street address</label>
            <input
              value={fields['company.street']}
              onChange={set('company.street')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Postal code</label>
            <input
              value={fields['company.zip']}
              onChange={set('company.zip')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
            <input
              value={fields['company.city']}
              onChange={set('company.city')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
            <input
              value={fields['company.country']}
              onChange={set('company.country')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
            <input
              value={fields['company.phone']}
              onChange={set('company.phone')}
              type="tel"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              value={fields['company.email']}
              onChange={set('company.email')}
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Website</label>
            <input
              value={fields['company.website']}
              onChange={set('company.website')}
              type="url"
              placeholder="https://printshop.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">VAT number</label>
            <input
              value={fields['company.vatNumber']}
              onChange={set('company.vatNumber')}
              placeholder="DE123456789"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Currency</p>
        <div className="flex items-center gap-3">
          <select
            value={fields['company.currency']}
            onChange={set('company.currency')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">Used in invoices and customer-facing prices</span>
        </div>
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
