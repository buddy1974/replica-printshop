'use client'

import { useEffect, useState } from 'react'
import Container from '@/components/Container'
import Button from '@/components/Button'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'

interface Category {
  id: string
  name: string
  slug: string
  sortOrder: number
  defaultPriceMode: string | null
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
}

const inputCls = 'rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-full'
const labelCls = 'block text-xs font-medium text-gray-600 mb-0.5'

export default function AdminCategoriesPage() {
  const { t } = useLocale()
  const td = t.admin
  const [categories, setCategories] = useState<Category[]>([])
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then(setCategories)
  }, [])

  const handleChange = (id: string, field: keyof Category, value: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const handleSave = async (cat: Category) => {
    const res = await fetch(`/api/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        defaultPriceMode: cat.defaultPriceMode,
        metaTitle: cat.metaTitle,
        metaDescription: cat.metaDescription,
      }),
    })
    if (res.ok) {
      setSaved((prev) => ({ ...prev, [cat.id]: true }))
      setTimeout(() => setSaved((prev) => ({ ...prev, [cat.id]: false })), 2000)
    }
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <h1>{td.categories}</h1>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">{td.noCategories}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>{td.name}</label>
                  <input
                    className={inputCls}
                    value={cat.name}
                    onChange={(e) => handleChange(cat.id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{td.slug}</label>
                  <input className={`${inputCls} bg-gray-50 text-gray-400`} value={cat.slug} readOnly />
                </div>
                <div>
                  <label className={labelCls}>{td.sortOrder}</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={cat.sortOrder}
                    onChange={(e) => handleChange(cat.id, 'sortOrder', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{td.defaultPriceMode}</label>
                  <select
                    className={inputCls}
                    value={cat.defaultPriceMode ?? ''}
                    onChange={(e) => handleChange(cat.id, 'defaultPriceMode', e.target.value)}
                  >
                    <option value="">{td.noneOption}</option>
                    <option value="PIECE">PIECE</option>
                    <option value="METER">METER</option>
                    <option value="AREA">AREA</option>
                    <option value="FIXED">FIXED</option>
                    <option value="TIER">TIER</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className={labelCls}>{td.descriptionLabel}</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={cat.description ?? ''}
                  onChange={(e) => handleChange(cat.id, 'description', e.target.value)}
                  placeholder={td.descriptionPlaceholder}
                />
              </div>
              <div className="mb-3">
                <label className={labelCls}>{td.metaTitleLabel}</label>
                <input
                  className={inputCls}
                  value={cat.metaTitle ?? ''}
                  onChange={(e) => handleChange(cat.id, 'metaTitle', e.target.value)}
                  placeholder={cat.name}
                />
              </div>
              <div className="mb-3">
                <label className={labelCls}>{td.metaDescriptionLabel}</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={cat.metaDescription ?? ''}
                  onChange={(e) => handleChange(cat.id, 'metaDescription', e.target.value)}
                  placeholder={td.metaDescPlaceholder}
                />
              </div>
              <Button variant="secondary" onClick={() => handleSave(cat)}>
                {saved[cat.id] ? td.savedLabel : td.save}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">{td.backToAdmin}</Link>
      </div>
    </Container>
  )
}
