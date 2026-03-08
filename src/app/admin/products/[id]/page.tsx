'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface ProductConfig {
  type: string
  hasCustomSize: boolean
  hasFixedSizes: boolean
  hasVariants: boolean
  hasOptions: boolean
  fixedSizes: string | null
  minWidth: number | null
  maxWidth: number | null
  minHeight: number | null
  maxHeight: number | null
  printWidth: number | null
  printHeight: number | null
  pricingType: string | null
  pickupAllowed: boolean | null
  notes: string | null
  maxWidthCm: number | null
  maxHeightCm: number | null
  rollWidthCm: number | null
  dtfMaxWidthCm: number | null
  cutOnly: boolean
  printAndCut: boolean
  needsUpload: boolean
  priceMode: string | null
  printAreaWidthCm: number | null
  printAreaHeightCm: number | null
  placementMode: string | null
}

interface PricingTableRow {
  id: string
  type: string
  minQty: number | null
  maxQty: number | null
  minWidth: number | null
  maxWidth: number | null
  minHeight: number | null
  maxHeight: number | null
  price: number
  pricePerM2: number | null
}

interface MockupTemplate {
  id: string
  name: string
  imageUrl: string
  printAreaX: number | null
  printAreaY: number | null
  printAreaWidth: number | null
  printAreaHeight: number | null
}

interface Product {
  id: string
  name: string
  slug: string
  category: string
  active: boolean
  guideText: string | null
  minDpi: number | null
  recommendedDpi: number | null
  bleedMm: number | null
  safeMarginMm: number | null
  allowedFormats: string | null
  notes: string | null
}

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>({})
  const [saved, setSaved] = useState(false)
  const [, setConfig] = useState<ProductConfig | null>(null)
  const [configForm, setConfigForm] = useState<Partial<ProductConfig> & { type: string }>({ type: 'print', pickupAllowed: false })
  const [configSaved, setConfigSaved] = useState(false)
  const [pricingRows, setPricingRows] = useState<PricingTableRow[]>([])
  const [priceForm, setPriceForm] = useState({ type: 'AREA', minQty: '', maxQty: '', minWidth: '', maxWidth: '', minHeight: '', maxHeight: '', price: '', pricePerM2: '' })
  const [templates, setTemplates] = useState<MockupTemplate[]>([])
  const [mockupForm, setMockupForm] = useState({ name: '', imageUrl: '', printAreaX: '', printAreaY: '', printAreaWidth: '', printAreaHeight: '' })
  const [mockupSaved, setMockupSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/products/${id}/config`)
      .then((r) => r.json())
      .then((c: ProductConfig | null) => {
        if (c) {
          setConfig(c)
          setConfigForm({
            type: c.type,
            hasCustomSize: c.hasCustomSize,
            hasFixedSizes: c.hasFixedSizes,
            hasVariants: c.hasVariants,
            hasOptions: c.hasOptions,
            fixedSizes: c.fixedSizes ?? '',
            minWidth: c.minWidth ?? undefined,
            maxWidth: c.maxWidth ?? undefined,
            minHeight: c.minHeight ?? undefined,
            maxHeight: c.maxHeight ?? undefined,
            printWidth: c.printWidth ?? undefined,
            printHeight: c.printHeight ?? undefined,
            pricingType: c.pricingType ?? '',
            pickupAllowed: c.pickupAllowed ?? false,
            notes: c.notes ?? '',
            maxWidthCm: c.maxWidthCm ?? undefined,
            maxHeightCm: c.maxHeightCm ?? undefined,
            rollWidthCm: c.rollWidthCm ?? undefined,
            dtfMaxWidthCm: c.dtfMaxWidthCm ?? undefined,
            cutOnly: c.cutOnly,
            printAndCut: c.printAndCut,
            needsUpload: c.needsUpload,
            priceMode: c.priceMode ?? '',
            printAreaWidthCm: c.printAreaWidthCm ?? undefined,
            printAreaHeightCm: c.printAreaHeightCm ?? undefined,
            placementMode: c.placementMode ?? '',
          })
        }
      })
  }, [id])

  useEffect(() => {
    fetch(`/api/products/${id}/pricing-table`)
      .then((r) => r.json())
      .then(setPricingRows)
  }, [id])

  useEffect(() => {
    fetch(`/api/products/${id}/mockup`)
      .then((r) => r.json())
      .then(setTemplates)
  }, [id])

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((p: Product) => {
        setProduct(p)
        setForm({
          name: p.name,
          slug: p.slug,
          category: p.category,
          active: p.active,
          guideText: p.guideText ?? '',
          minDpi: p.minDpi ?? undefined,
          recommendedDpi: p.recommendedDpi ?? undefined,
          bleedMm: p.bleedMm ?? undefined,
          safeMarginMm: p.safeMarginMm ?? undefined,
          allowedFormats: p.allowedFormats ?? '',
          notes: p.notes ?? '',
        })
      })
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }))
  }

  const handleSave = async () => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleDeactivate = async () => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    router.push('/admin/products')
  }

  if (!product) return <p>Loading…</p>

  return (
    <main>
      <h1>Edit: {product.name}</h1>

      <h2>Basic info</h2>
      <div>
        <label>Name<br /><input name="name" value={form.name ?? ''} onChange={handleChange} /></label>
      </div>
      <div>
        <label>Slug<br /><input name="slug" value={form.slug ?? ''} onChange={handleChange} /></label>
      </div>
      <div>
        <label>Category<br /><input name="category" value={form.category ?? ''} onChange={handleChange} /></label>
      </div>

      <h2>File guide</h2>
      <div>
        <label>Guide text<br />
          <textarea name="guideText" value={form.guideText ?? ''} onChange={handleChange} rows={3} />
        </label>
      </div>
      <div>
        <label>Min DPI<br /><input name="minDpi" type="number" value={form.minDpi ?? ''} onChange={handleChange} /></label>
      </div>
      <div>
        <label>Recommended DPI<br /><input name="recommendedDpi" type="number" value={form.recommendedDpi ?? ''} onChange={handleChange} /></label>
      </div>
      <div>
        <label>Bleed (mm)<br /><input name="bleedMm" type="number" value={form.bleedMm ?? ''} onChange={handleChange} /></label>
      </div>
      <div>
        <label>Safe margin (mm)<br /><input name="safeMarginMm" type="number" value={form.safeMarginMm ?? ''} onChange={handleChange} /></label>
      </div>
      <div>
        <label>Allowed formats (comma-separated)<br /><input name="allowedFormats" value={form.allowedFormats ?? ''} onChange={handleChange} /></label>
      </div>
      <div>
        <label>Notes<br />
          <textarea name="notes" value={form.notes ?? ''} onChange={handleChange} rows={2} />
        </label>
      </div>

      <button onClick={handleSave}>{saved ? 'Saved!' : 'Save changes'}</button>
      <button onClick={handleDeactivate}>Deactivate product</button>

      <h2>Product config</h2>
      <div>
        <label>Type<br /><input value={configForm.type} onChange={(e) => setConfigForm((p) => ({ ...p, type: e.target.value }))} /></label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.hasCustomSize ?? false} onChange={(e) => setConfigForm((p) => ({ ...p, hasCustomSize: e.target.checked }))} /> Custom size</label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.hasFixedSizes ?? false} onChange={(e) => setConfigForm((p) => ({ ...p, hasFixedSizes: e.target.checked }))} /> Fixed sizes</label>
      </div>
      <div>
        <label>Fixed sizes (e.g. 100x200,50x70)<br /><input value={configForm.fixedSizes ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, fixedSizes: e.target.value }))} /></label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.hasVariants ?? false} onChange={(e) => setConfigForm((p) => ({ ...p, hasVariants: e.target.checked }))} /> Variants</label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.hasOptions ?? false} onChange={(e) => setConfigForm((p) => ({ ...p, hasOptions: e.target.checked }))} /> Options</label>
      </div>
      <div>
        <label>Min width (cm)<br /><input type="number" value={configForm.minWidth ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, minWidth: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Max width (cm)<br /><input type="number" value={configForm.maxWidth ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, maxWidth: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Min height (cm)<br /><input type="number" value={configForm.minHeight ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, minHeight: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Max height (cm)<br /><input type="number" value={configForm.maxHeight ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, maxHeight: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Print area width (cm)<br /><input type="number" value={configForm.printWidth ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, printWidth: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Print area height (cm)<br /><input type="number" value={configForm.printHeight ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, printHeight: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Pricing type<br />
          <select value={configForm.pricingType ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, pricingType: e.target.value }))}>
            <option value="">— default (PricingRule) —</option>
            <option value="area">area</option>
            <option value="fixed">fixed</option>
            <option value="quantity">quantity</option>
            <option value="table">table</option>
          </select>
        </label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.pickupAllowed ?? false} onChange={(e) => setConfigForm((p) => ({ ...p, pickupAllowed: e.target.checked }))} /> Pickup allowed</label>
      </div>

      <h3>Print constraints</h3>
      <div>
        <label>Max width (cm) — hard limit<br /><input type="number" value={configForm.maxWidthCm ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, maxWidthCm: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Max height (cm) — hard limit<br /><input type="number" value={configForm.maxHeightCm ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, maxHeightCm: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Roll width (cm)<br /><input type="number" value={configForm.rollWidthCm ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, rollWidthCm: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>DTF max width (cm)<br /><input type="number" value={configForm.dtfMaxWidthCm ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, dtfMaxWidthCm: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.cutOnly ?? false} onChange={(e) => setConfigForm((p) => ({ ...p, cutOnly: e.target.checked }))} /> Cut only</label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.printAndCut ?? false} onChange={(e) => setConfigForm((p) => ({ ...p, printAndCut: e.target.checked }))} /> Print and cut</label>
      </div>
      <div>
        <label><input type="checkbox" checked={configForm.needsUpload ?? true} onChange={(e) => setConfigForm((p) => ({ ...p, needsUpload: e.target.checked }))} /> Needs file upload</label>
      </div>
      <div>
        <label>Price mode<br />
          <select value={configForm.priceMode ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, priceMode: e.target.value }))}>
            <option value="">— default —</option>
            <option value="area">area</option>
            <option value="fixed">fixed</option>
            <option value="quantity">quantity</option>
          </select>
        </label>
      </div>

      <h3>Textile / garment</h3>
      <div>
        <label>Print area width (cm)<br /><input type="number" value={configForm.printAreaWidthCm ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, printAreaWidthCm: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Print area height (cm)<br /><input type="number" value={configForm.printAreaHeightCm ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, printAreaHeightCm: e.target.value ? Number(e.target.value) : undefined }))} /></label>
      </div>
      <div>
        <label>Placement mode<br />
          <select value={configForm.placementMode ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, placementMode: e.target.value }))}>
            <option value="">— none —</option>
            <option value="front">front</option>
            <option value="back">back</option>
            <option value="front_back">front + back</option>
            <option value="custom">custom</option>
          </select>
        </label>
      </div>
      <div>
        <label>Notes<br /><textarea value={configForm.notes ?? ''} onChange={(e) => setConfigForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></label>
      </div>
      <button onClick={async () => {
        const res = await fetch(`/api/products/${id}/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configForm),
        })
        if (res.ok) {
          setConfig(await res.json())
          setConfigSaved(true)
          setTimeout(() => setConfigSaved(false), 2000)
        }
      }}>
        {configSaved ? 'Saved!' : 'Save config'}
      </button>

      <h2>Pricing table</h2>
      {pricingRows.length === 0 && <p>No pricing rows yet.</p>}
      {pricingRows.map((row) => (
        <div key={row.id} style={{ border: '1px solid #ccc', padding: '8px', marginBottom: '8px' }}>
          <strong>{row.type}</strong>
          {row.minQty != null && <span> qty: {row.minQty}–{row.maxQty ?? '∞'}</span>}
          {row.minWidth != null && <span> w: {row.minWidth}–{row.maxWidth ?? '∞'}</span>}
          {row.minHeight != null && <span> h: {row.minHeight}–{row.maxHeight ?? '∞'}</span>}
          <span> price: {row.price}</span>
          {row.pricePerM2 != null && <span> /m²: {row.pricePerM2}</span>}
          <button onClick={async () => {
            const res = await fetch(`/api/products/${id}/pricing-table`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: row.id }),
            })
            if (res.ok) setPricingRows((prev) => prev.filter((r) => r.id !== row.id))
          }} style={{ marginLeft: '8px' }}>Delete</button>
        </div>
      ))}

      <h3>Add pricing row</h3>
      <div>
        <label>Type<br />
          <select value={priceForm.type} onChange={(e) => setPriceForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="FIXED">FIXED</option>
            <option value="QUANTITY">QUANTITY</option>
            <option value="AREA">AREA</option>
          </select>
        </label>
      </div>
      <div>
        <label>Min qty<br /><input type="number" value={priceForm.minQty} onChange={(e) => setPriceForm((p) => ({ ...p, minQty: e.target.value }))} /></label>
      </div>
      <div>
        <label>Max qty<br /><input type="number" value={priceForm.maxQty} onChange={(e) => setPriceForm((p) => ({ ...p, maxQty: e.target.value }))} /></label>
      </div>
      <div>
        <label>Min width (cm)<br /><input type="number" value={priceForm.minWidth} onChange={(e) => setPriceForm((p) => ({ ...p, minWidth: e.target.value }))} /></label>
      </div>
      <div>
        <label>Max width (cm)<br /><input type="number" value={priceForm.maxWidth} onChange={(e) => setPriceForm((p) => ({ ...p, maxWidth: e.target.value }))} /></label>
      </div>
      <div>
        <label>Min height (cm)<br /><input type="number" value={priceForm.minHeight} onChange={(e) => setPriceForm((p) => ({ ...p, minHeight: e.target.value }))} /></label>
      </div>
      <div>
        <label>Max height (cm)<br /><input type="number" value={priceForm.maxHeight} onChange={(e) => setPriceForm((p) => ({ ...p, maxHeight: e.target.value }))} /></label>
      </div>
      <div>
        <label>Price (flat)<br /><input type="number" value={priceForm.price} onChange={(e) => setPriceForm((p) => ({ ...p, price: e.target.value }))} /></label>
      </div>
      <div>
        <label>Price per m² (optional)<br /><input type="number" value={priceForm.pricePerM2} onChange={(e) => setPriceForm((p) => ({ ...p, pricePerM2: e.target.value }))} /></label>
      </div>
      <button onClick={async () => {
        const body = {
          type: priceForm.type,
          minQty: priceForm.minQty ? Number(priceForm.minQty) : undefined,
          maxQty: priceForm.maxQty ? Number(priceForm.maxQty) : undefined,
          minWidth: priceForm.minWidth ? Number(priceForm.minWidth) : undefined,
          maxWidth: priceForm.maxWidth ? Number(priceForm.maxWidth) : undefined,
          minHeight: priceForm.minHeight ? Number(priceForm.minHeight) : undefined,
          maxHeight: priceForm.maxHeight ? Number(priceForm.maxHeight) : undefined,
          price: priceForm.price ? Number(priceForm.price) : 0,
          pricePerM2: priceForm.pricePerM2 ? Number(priceForm.pricePerM2) : undefined,
        }
        const res = await fetch(`/api/products/${id}/pricing-table`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const row = await res.json()
          setPricingRows((prev) => [...prev, row])
          setPriceForm({ type: 'AREA', minQty: '', maxQty: '', minWidth: '', maxWidth: '', minHeight: '', maxHeight: '', price: '', pricePerM2: '' })
        }
      }}>Add row</button>

      <h2>Mockup templates</h2>
      {templates.length === 0 && <p>No templates yet.</p>}
      {templates.map((t) => (
        <div key={t.id}>
          <p><strong>{t.name}</strong> — {t.imageUrl}</p>
          {t.printAreaX != null && (
            <p>Print area: x={t.printAreaX} y={t.printAreaY} w={t.printAreaWidth} h={t.printAreaHeight}</p>
          )}
        </div>
      ))}

      <h3>Add mockup template</h3>
      <div>
        <label>Name<br /><input value={mockupForm.name} onChange={(e) => setMockupForm((p) => ({ ...p, name: e.target.value }))} /></label>
      </div>
      <div>
        <label>Image URL<br /><input value={mockupForm.imageUrl} onChange={(e) => setMockupForm((p) => ({ ...p, imageUrl: e.target.value }))} /></label>
      </div>
      <div>
        <label>Print area X<br /><input type="number" value={mockupForm.printAreaX} onChange={(e) => setMockupForm((p) => ({ ...p, printAreaX: e.target.value }))} /></label>
      </div>
      <div>
        <label>Print area Y<br /><input type="number" value={mockupForm.printAreaY} onChange={(e) => setMockupForm((p) => ({ ...p, printAreaY: e.target.value }))} /></label>
      </div>
      <div>
        <label>Print area width<br /><input type="number" value={mockupForm.printAreaWidth} onChange={(e) => setMockupForm((p) => ({ ...p, printAreaWidth: e.target.value }))} /></label>
      </div>
      <div>
        <label>Print area height<br /><input type="number" value={mockupForm.printAreaHeight} onChange={(e) => setMockupForm((p) => ({ ...p, printAreaHeight: e.target.value }))} /></label>
      </div>
      <button onClick={async () => {
        const res = await fetch(`/api/products/${id}/mockup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: mockupForm.name,
            imageUrl: mockupForm.imageUrl,
            printAreaX: mockupForm.printAreaX ? Number(mockupForm.printAreaX) : undefined,
            printAreaY: mockupForm.printAreaY ? Number(mockupForm.printAreaY) : undefined,
            printAreaWidth: mockupForm.printAreaWidth ? Number(mockupForm.printAreaWidth) : undefined,
            printAreaHeight: mockupForm.printAreaHeight ? Number(mockupForm.printAreaHeight) : undefined,
          }),
        })
        if (res.ok) {
          const t = await res.json()
          setTemplates((prev) => [...prev, t])
          setMockupForm({ name: '', imageUrl: '', printAreaX: '', printAreaY: '', printAreaWidth: '', printAreaHeight: '' })
          setMockupSaved(true)
          setTimeout(() => setMockupSaved(false), 2000)
        }
      }}>
        {mockupSaved ? 'Added!' : 'Add template'}
      </button>
    </main>
  )
}
