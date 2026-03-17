'use client'

import { useEffect, useState } from 'react'
import Container from '@/components/Container'
import Button from '@/components/Button'
import Link from 'next/link'

interface TaxRate {
  id: string
  country: string
  rate: number
  label: string | null
}

// Hardcoded fallback rates for reference (mirrors src/lib/tax.ts)
const FALLBACK_RATES: Record<string, { rate: number; label: string }> = {
  DEFAULT: { rate: 19, label: 'Default (fallback)' },
  AT: { rate: 20, label: 'Austria' },
  DE: { rate: 19, label: 'Germany' },
  FR: { rate: 20, label: 'France' },
  IT: { rate: 22, label: 'Italy' },
  ES: { rate: 21, label: 'Spain' },
  NL: { rate: 21, label: 'Netherlands' },
  BE: { rate: 21, label: 'Belgium' },
  PL: { rate: 23, label: 'Poland' },
  PT: { rate: 23, label: 'Portugal' },
  SE: { rate: 25, label: 'Sweden' },
  DK: { rate: 25, label: 'Denmark' },
  FI: { rate: 24, label: 'Finland' },
  NO: { rate: 25, label: 'Norway' },
  CH: { rate: 8.1, label: 'Switzerland' },
  GB: { rate: 20, label: 'United Kingdom' },
}

const IC = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-full'
const EMPTY = { country: '', rate: '', label: '' }

export default function TaxPage() {
  const [rates, setRates] = useState<TaxRate[]>([])
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/tax').then((r) => r.json()).then(setRates)
  }, [])

  const handleSave = async () => {
    setError(null)
    if (!form.country.trim() || !form.rate.trim()) {
      setError('Country and rate are required.')
      return
    }
    const res = await fetch('/api/admin/tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: form.country.trim().toUpperCase(),
        rate: parseFloat(form.rate),
        label: form.label.trim() || null,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Could not save.')
      return
    }
    const row: TaxRate = await res.json()
    setRates((prev) => {
      const filtered = prev.filter((r) => r.country !== row.country)
      return [...filtered, row].sort((a, b) => a.country.localeCompare(b.country))
    })
    setForm(EMPTY)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/admin/tax', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setRates((prev) => prev.filter((r) => r.id !== id))
  }

  // Quick-fill form from a fallback rate
  const quickFill = (country: string) => {
    const fb = FALLBACK_RATES[country]
    if (!fb) return
    setForm({ country, rate: String(fb.rate), label: fb.label })
  }

  return (
    <Container>
      <h1 className="mb-2">Tax / VAT</h1>
      <p className="text-sm text-gray-500 mb-8">
        Configure VAT rates per country. Rates here override the built-in table.
        Use <strong>DEFAULT</strong> as the country code to set the global fallback rate.
      </p>

      {/* ── Configured rates ── */}
      <section className="mb-10">
        <h2 className="mb-3">Configured rates</h2>

        {rates.length === 0 ? (
          <p className="text-sm text-gray-400 mb-6">
            No overrides configured. Built-in EU rates are used (Germany 19%, Austria 20%, etc.).
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white mb-6">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Country', 'Rate', 'Label', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{r.country}</span>
                      {r.country === 'DEFAULT' && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">fallback</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{Number(r.rate).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-gray-500">{r.label ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Button variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Add / edit rate ── */}
        <h3 className="mb-3">Add or update rate</h3>
        <div className="flex flex-col gap-4 max-w-sm">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">
              Country code <span className="text-gray-400 font-normal">(e.g. DE, AT, CH — or DEFAULT)</span>
            </span>
            <input
              type="text"
              placeholder="DE"
              maxLength={8}
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value.toUpperCase() }))}
              className={IC}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Rate (%)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="19"
              value={form.rate}
              onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
              className={IC}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Label <span className="text-gray-400 font-normal">(optional)</span></span>
            <input
              type="text"
              placeholder="Germany"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              className={IC}
            />
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button onClick={handleSave}>{saved ? 'Saved!' : 'Save rate'}</Button>
        </div>

        {/* Quick-fill shortcuts */}
        <div className="mt-6">
          <p className="text-xs text-gray-500 mb-2">Quick-fill from built-in table:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FALLBACK_RATES).map(([cc, { rate, label }]) => (
              <button
                key={cc}
                type="button"
                onClick={() => quickFill(cc)}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:border-gray-400 text-gray-600 transition-colors"
              >
                {cc} {rate}% — {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Info ── */}
      <section className="mb-10 max-w-lg">
        <h2 className="mb-3">How VAT works in this system</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 text-sm text-gray-600">
          <p>
            All prices are <strong>gross (VAT-inclusive)</strong> — Bruttopreis.
            VAT is <em>extracted</em> from the total for display only; it never changes what the customer pays.
          </p>
          <p>
            Formula: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">VAT = total × rate / (100 + rate)</code>
          </p>
          <p>
            Rate resolution order:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-gray-500">
            <li>DB override for exact billing country (this page)</li>
            <li>DB entry with country = &ldquo;DEFAULT&rdquo; (this page)</li>
            <li>Built-in EU rate table (Germany 19%, Austria 20%, etc.)</li>
            <li>Hard fallback: 19%</li>
          </ol>
          <p className="text-xs text-gray-400">
            B2B / reverse charge support can be added in a future step without changing this structure.
          </p>
        </div>
      </section>

      <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
    </Container>
  )
}
