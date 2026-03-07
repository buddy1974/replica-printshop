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

const typeLabels: Record<string, string> = {
  FLAT:                 'Flat rate',
  FREE_OVER:            'Free over total',
  EXPRESS_MULTIPLIER:   'Express multiplier',
}

export default function ShippingRulesPage() {
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [form, setForm] = useState({ type: 'FLAT', minTotal: '', price: '', multiplier: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/shipping')
      .then((r) => r.json())
      .then(setRules)
  }, [])

  const handleAdd = async () => {
    const body = {
      type: form.type,
      minTotal:   form.minTotal   ? Number(form.minTotal)   : undefined,
      price:      form.price      ? Number(form.price)      : undefined,
      multiplier: form.multiplier ? Number(form.multiplier) : undefined,
    }
    const res = await fetch('/api/admin/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const rule = await res.json()
      setRules((prev) => [...prev, rule])
      setForm({ type: 'FLAT', minTotal: '', price: '', multiplier: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/admin/shipping', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const inputCls = 'rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-full'

  return (
    <Container>
      <h1 className="mb-6">Shipping rules</h1>

      {rules.length === 0 ? (
        <p className="text-sm text-gray-500 mb-6">No shipping rules yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white mb-8">
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
                  <td className="px-4 py-3 font-medium">{typeLabels[rule.type] ?? rule.type}</td>
                  <td className="px-4 py-3 text-gray-600">{rule.minTotal != null ? `€${Number(rule.minTotal).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{rule.price != null ? `€${Number(rule.price).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{rule.multiplier != null ? `×${Number(rule.multiplier).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <Button variant="danger" onClick={() => handleDelete(rule.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-4">Add rule</h2>
      <div className="flex flex-col gap-4 max-w-sm">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Type</span>
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className={inputCls}>
            <option value="FLAT">Flat — standard shipping rate</option>
            <option value="FREE_OVER">Free over — free when order ≥ min total</option>
            <option value="EXPRESS_MULTIPLIER">Express multiplier — multiply flat rate for express</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Min total (€) <span className="text-gray-400 font-normal">— for FREE_OVER</span></span>
          <input type="number" value={form.minTotal} onChange={(e) => setForm((p) => ({ ...p, minTotal: e.target.value }))} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Price (€) <span className="text-gray-400 font-normal">— for FLAT</span></span>
          <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Multiplier <span className="text-gray-400 font-normal">— for EXPRESS_MULTIPLIER</span></span>
          <input type="number" step="0.01" value={form.multiplier} onChange={(e) => setForm((p) => ({ ...p, multiplier: e.target.value }))} className={inputCls} />
        </label>
        <Button onClick={handleAdd}>{saved ? 'Added!' : 'Add rule'}</Button>
      </div>

      <div className="mt-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
      </div>
    </Container>
  )
}
