'use client'

import { useEffect, useState } from 'react'
import Container from '@/components/Container'
import Button from '@/components/Button'
import Link from 'next/link'

interface ShippingRule {
  id: string
  type: string
  method: string | null
  country: string | null
  minTotal: number | null
  minSize: number | null
  maxSize: number | null
  minQty: number | null
  maxQty: number | null
  price: number | null
  multiplier: number | null
}

interface ShippingMethod {
  id: string
  name: string
  price: number
  type: string
  active: boolean
}

const RULE_TYPE_LABELS: Record<string, string> = {
  FLAT:               'Flat rate',
  FREE_OVER:          'Free over subtotal',
  EXPRESS_MULTIPLIER: 'Express multiplier',
  SIZE_TIER:          'Size tier',
  COUNTRY_SURCHARGE:  'Country surcharge',
}

// Fields shown per rule type
const SHOW: Record<string, { method?: true; country?: true; minTotal?: true; price?: true; multiplier?: true; size?: true; qty?: true }> = {
  FLAT:               { method: true, price: true },
  FREE_OVER:          { method: true, country: true, minTotal: true },
  EXPRESS_MULTIPLIER: { multiplier: true },
  SIZE_TIER:          { method: true, country: true, size: true, qty: true, price: true },
  COUNTRY_SURCHARGE:  { method: true, country: true, price: true },
}

const EMPTY_FORM = {
  type: 'FLAT',
  method: '',
  country: '',
  minTotal: '',
  price: '',
  multiplier: '',
  minSize: '',
  maxSize: '',
  minQty: '',
  maxQty: '',
}

const IC = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-full'

function fmt(v: number | null, prefix = ''): string {
  return v != null ? `${prefix}${Number(v).toFixed(2)}` : '—'
}

export default function ShippingPage() {
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [ruleForm, setRuleForm] = useState(EMPTY_FORM)
  const [ruleSaved, setRuleSaved] = useState(false)

  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [editing, setEditing] = useState<Record<string, { name: string; price: string; active: boolean }>>({})

  useEffect(() => {
    fetch('/api/admin/shipping').then((r) => r.json()).then(setRules)
    fetch('/api/admin/shipping-methods').then((r) => r.json()).then((ms: ShippingMethod[]) => {
      setMethods(ms)
      const init: typeof editing = {}
      for (const m of ms) init[m.id] = { name: m.name, price: String(m.price), active: m.active }
      setEditing(init)
    })
  }, [])

  const handleAddRule = async () => {
    const show = SHOW[ruleForm.type] ?? {}
    const body: Record<string, unknown> = { type: ruleForm.type }
    if (show.method)      body.method     = ruleForm.method     || null
    if (show.country)     body.country    = ruleForm.country    || null
    if (show.minTotal)    body.minTotal   = ruleForm.minTotal   ? Number(ruleForm.minTotal)   : null
    if (show.price)       body.price      = ruleForm.price      ? Number(ruleForm.price)      : null
    if (show.multiplier)  body.multiplier = ruleForm.multiplier ? Number(ruleForm.multiplier) : null
    if (show.size) {
      body.minSize = ruleForm.minSize ? Number(ruleForm.minSize) : null
      body.maxSize = ruleForm.maxSize ? Number(ruleForm.maxSize) : null
    }
    if (show.qty) {
      body.minQty = ruleForm.minQty ? Number(ruleForm.minQty) : null
      body.maxQty = ruleForm.maxQty ? Number(ruleForm.maxQty) : null
    }

    const res = await fetch('/api/admin/shipping', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const rule = await res.json()
      setRules((prev) => [...prev, rule])
      setRuleForm(EMPTY_FORM)
      setRuleSaved(true)
      setTimeout(() => setRuleSaved(false), 2000)
    }
  }

  const handleDeleteRule = async (id: string) => {
    const res = await fetch('/api/admin/shipping', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSaveMethod = async (id: string) => {
    const e = editing[id]
    if (!e) return
    const res = await fetch(`/api/admin/shipping-methods/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: e.name, price: Number(e.price), active: e.active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMethods((prev) => prev.map((m) => (m.id === id ? updated : m)))
    }
  }

  const show = SHOW[ruleForm.type] ?? {}

  return (
    <Container>
      <h1 className="mb-8">Shipping</h1>

      {/* ── Shipping methods ── */}
      <section className="mb-10">
        <h2 className="mb-4">Shipping methods</h2>
        <p className="text-sm text-gray-500 mb-4">Methods available at checkout. Edit name, price, and active status.</p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['Type', 'Name', 'Price (€)', 'Active', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {methods.map((m) => {
                const e = editing[m.id] ?? { name: m.name, price: String(m.price), active: m.active }
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.type}</td>
                    <td className="px-4 py-2">
                      <input
                        value={e.name}
                        onChange={(ev) => setEditing((p) => ({ ...p, [m.id]: { ...e, name: ev.target.value } }))}
                        className="rounded border border-gray-300 px-2 py-1 text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-2 w-28">
                      <input
                        type="number"
                        step="0.01"
                        value={e.price}
                        onChange={(ev) => setEditing((p) => ({ ...p, [m.id]: { ...e, price: ev.target.value } }))}
                        className="rounded border border-gray-300 px-2 py-1 text-sm w-full"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={e.active}
                        onChange={(ev) => setEditing((p) => ({ ...p, [m.id]: { ...e, active: ev.target.checked } }))}
                        className="accent-gray-900"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Button onClick={() => handleSaveMethod(m.id)}>Save</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Pricing rules ── */}
      <section className="mb-10">
        <h2 className="mb-4">Pricing rules</h2>
        <p className="text-sm text-gray-500 mb-4">
          Rules for calculating shipping cost. Priority: SIZE_TIER &gt; FLAT &gt; fallback €5. Country surcharges are additive.
        </p>

        {rules.length === 0 ? (
          <p className="text-sm text-gray-500 mb-6">No pricing rules yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white mb-6">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Type', 'Method', 'Country', 'Size (cm)', 'Qty', 'Min total', 'Price', 'Multiplier', ''].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{RULE_TYPE_LABELS[rule.type] ?? rule.type}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{rule.method ?? 'All'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{rule.country ?? 'All'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {rule.minSize != null || rule.maxSize != null
                        ? `${rule.minSize ?? 0}–${rule.maxSize ?? '∞'}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {rule.minQty != null || rule.maxQty != null
                        ? `${rule.minQty ?? 1}–${rule.maxQty ?? '∞'}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-500">{fmt(rule.minTotal, '€')}</td>
                    <td className="px-3 py-3 text-gray-500">{fmt(rule.price, '€')}</td>
                    <td className="px-3 py-3 text-gray-500">
                      {rule.multiplier != null ? `×${Number(rule.multiplier).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <Button variant="danger" onClick={() => handleDeleteRule(rule.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mb-3">Add pricing rule</h3>
        <div className="flex flex-col gap-4 max-w-sm">
          {/* Type */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select value={ruleForm.type} onChange={(e) => setRuleForm({ ...EMPTY_FORM, type: e.target.value })} className={IC}>
              <option value="FLAT">Flat rate — standard base price</option>
              <option value="FREE_OVER">Free over — free when subtotal ≥ threshold</option>
              <option value="EXPRESS_MULTIPLIER">Express multiplier</option>
              <option value="SIZE_TIER">Size tier — price by largest item side</option>
              <option value="COUNTRY_SURCHARGE">Country surcharge — additive per country</option>
            </select>
          </label>

          {/* Method */}
          {show.method && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Method <span className="text-gray-400 font-normal">(blank = all)</span></span>
              <select value={ruleForm.method} onChange={(e) => setRuleForm((p) => ({ ...p, method: e.target.value }))} className={IC}>
                <option value="">All methods</option>
                <option value="STANDARD">Standard</option>
                <option value="EXPRESS">Express</option>
              </select>
            </label>
          )}

          {/* Country */}
          {show.country && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                Country <span className="text-gray-400 font-normal">{ruleForm.type === 'COUNTRY_SURCHARGE' ? '(required)' : '(blank = all)'}</span>
              </span>
              <input
                type="text"
                placeholder="AT, DE, CH, …"
                maxLength={2}
                value={ruleForm.country}
                onChange={(e) => setRuleForm((p) => ({ ...p, country: e.target.value.toUpperCase() }))}
                className={IC}
              />
            </label>
          )}

          {/* Min total */}
          {show.minTotal && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Minimum order total (€)</span>
              <input type="number" step="0.01" value={ruleForm.minTotal} onChange={(e) => setRuleForm((p) => ({ ...p, minTotal: e.target.value }))} className={IC} />
            </label>
          )}

          {/* Size range */}
          {show.size && (
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-gray-700">Min side (cm)</span>
                <input type="number" step="1" value={ruleForm.minSize} onChange={(e) => setRuleForm((p) => ({ ...p, minSize: e.target.value }))} className={IC} />
              </label>
              <label className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-gray-700">Max side (cm)</span>
                <input type="number" step="1" value={ruleForm.maxSize} onChange={(e) => setRuleForm((p) => ({ ...p, maxSize: e.target.value }))} className={IC} />
              </label>
            </div>
          )}

          {/* Qty range */}
          {show.qty && (
            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-gray-700">Min qty</span>
                <input type="number" step="1" value={ruleForm.minQty} onChange={(e) => setRuleForm((p) => ({ ...p, minQty: e.target.value }))} className={IC} />
              </label>
              <label className="flex flex-col gap-1 flex-1">
                <span className="text-sm font-medium text-gray-700">Max qty</span>
                <input type="number" step="1" value={ruleForm.maxQty} onChange={(e) => setRuleForm((p) => ({ ...p, maxQty: e.target.value }))} className={IC} />
              </label>
            </div>
          )}

          {/* Price */}
          {show.price && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Price (€)</span>
              <input type="number" step="0.01" value={ruleForm.price} onChange={(e) => setRuleForm((p) => ({ ...p, price: e.target.value }))} className={IC} />
            </label>
          )}

          {/* Multiplier */}
          {show.multiplier && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Multiplier (e.g. 1.5)</span>
              <input type="number" step="0.01" value={ruleForm.multiplier} onChange={(e) => setRuleForm((p) => ({ ...p, multiplier: e.target.value }))} className={IC} />
            </label>
          )}

          <Button onClick={handleAddRule}>{ruleSaved ? 'Added!' : 'Add rule'}</Button>
        </div>

        <div className="mt-6 text-xs text-gray-400 space-y-1 max-w-md">
          <p><strong>Flat rate</strong> — base price for all orders (or per method).</p>
          <p><strong>Free over</strong> — when subtotal ≥ threshold, shipping is free.</p>
          <p><strong>Express multiplier</strong> — multiply base price for express (e.g. 1.5).</p>
          <p><strong>Size tier</strong> — base price by largest item side in cm (+ optional country/method/qty filter).</p>
          <p><strong>Country surcharge</strong> — added on top of base price for specific countries.</p>
        </div>
      </section>

      <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
    </Container>
  )
}
