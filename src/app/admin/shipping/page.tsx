'use client'

import { useEffect, useState } from 'react'
import Container from '@/components/Container'
import Button from '@/components/Button'
import Link from 'next/link'

interface ShippingRule {
  id: string
  type: string
  minTotal: number | null
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

const ruleTypeLabels: Record<string, string> = {
  FLAT:               'Flat rate',
  FREE_OVER:          'Free over total',
  EXPRESS_MULTIPLIER: 'Express multiplier',
}

const inputCls = 'rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-full'

export default function ShippingPage() {
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [ruleForm, setRuleForm] = useState({ type: 'FLAT', minTotal: '', price: '', multiplier: '' })
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
    const body = {
      type: ruleForm.type,
      minTotal:   ruleForm.minTotal   ? Number(ruleForm.minTotal)   : undefined,
      price:      ruleForm.price      ? Number(ruleForm.price)      : undefined,
      multiplier: ruleForm.multiplier ? Number(ruleForm.multiplier) : undefined,
    }
    const res = await fetch('/api/admin/shipping', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const rule = await res.json()
      setRules((prev) => [...prev, rule])
      setRuleForm({ type: 'FLAT', minTotal: '', price: '', multiplier: '' })
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

      {/* ── Shipping rules ── */}
      <section className="mb-10">
        <h2 className="mb-4">Pricing rules</h2>
        <p className="text-sm text-gray-500 mb-4">Rules used to calculate shipping cost (flat rate, free-over threshold, express multiplier).</p>

        {rules.length === 0 ? (
          <p className="text-sm text-gray-500 mb-6">No pricing rules yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white mb-6">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Type', 'Min total', 'Price', 'Multiplier', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{ruleTypeLabels[rule.type] ?? rule.type}</td>
                    <td className="px-4 py-3 text-gray-600">{rule.minTotal != null ? `€${Number(rule.minTotal).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{rule.price != null ? `€${Number(rule.price).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{rule.multiplier != null ? `×${Number(rule.multiplier).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3">
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
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Type</span>
            <select value={ruleForm.type} onChange={(e) => setRuleForm((p) => ({ ...p, type: e.target.value }))} className={inputCls}>
              <option value="FLAT">Flat — standard shipping rate</option>
              <option value="FREE_OVER">Free over — free when order ≥ min total</option>
              <option value="EXPRESS_MULTIPLIER">Express multiplier</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Min total (€)</span>
            <input type="number" value={ruleForm.minTotal} onChange={(e) => setRuleForm((p) => ({ ...p, minTotal: e.target.value }))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Price (€)</span>
            <input type="number" value={ruleForm.price} onChange={(e) => setRuleForm((p) => ({ ...p, price: e.target.value }))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Multiplier</span>
            <input type="number" step="0.01" value={ruleForm.multiplier} onChange={(e) => setRuleForm((p) => ({ ...p, multiplier: e.target.value }))} className={inputCls} />
          </label>
          <Button onClick={handleAddRule}>{ruleSaved ? 'Added!' : 'Add rule'}</Button>
        </div>
      </section>

      <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
    </Container>
  )
}
