'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProductPreview from '@/components/ProductPreview'
import { setUserId as setSessionUserId, setUserEmail as setSessionUserEmail } from '@/lib/session'
import { useLocale } from '@/context/LocaleContext'

interface OptionValue {
  id: string
  name: string
  priceModifier: number
}

interface Option {
  id: string
  name: string
  values: OptionValue[]
}

interface Variant {
  id: string
  name: string
  material: string
  basePrice: number
}

interface ProductConfig {
  type?: string | null
  hasCustomSize: boolean
  hasFixedSizes: boolean
  hasVariants: boolean
  hasOptions: boolean
  fixedSizes: string | null
  minWidth: number | null
  maxWidth: number | null
  minHeight: number | null
  maxHeight: number | null
  pickupAllowed: boolean | null
  maxWidthCm: number | null
  maxHeightCm: number | null
  rollWidthCm: number | null
  dtfMaxWidthCm: number | null
  printAreaWidthCm: number | null
  printAreaHeightCm: number | null
  placementMode: string | null
  isTextile: boolean
  isRoll: boolean
  isCut: boolean
  needsPlacement: boolean
}

interface Product {
  id: string
  name: string
  variants: Variant[]
  options: Option[]
  pricingRules: { pricePerM2: number; minPrice: number; expressMultiplier: number }[]
  config: ProductConfig | null
}

interface ConfiguratorFormProps {
  product: Product
  initialWidth?: number | null
  initialHeight?: number | null
}

interface PriceResult {
  unitPrice: number
  totalPrice: number
  shippingPrice: number
}

const inputCls = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-full'
const labelCls = 'flex flex-col gap-1'
const labelTextCls = 'text-sm font-medium text-gray-700'

// Parse "W × H cm" or "(W × H mm)" from variant names like "85 × 200 cm" / "A1 (594 × 841 mm)"
function parseDimsFromVariantName(name: string): { w: number; h: number } | null {
  const cm = name.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*cm/i)
  if (cm) return { w: Number(cm[1]), h: Number(cm[2]) }
  const mm = name.match(/\((\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*mm\)/i)
  if (mm) return { w: Number(mm[1]) / 10, h: Number(mm[2]) / 10 }
  return null
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
        active
          ? 'bg-gray-900 border-gray-900 text-white'
          : 'border-gray-300 text-gray-700 bg-white hover:border-gray-500 hover:text-gray-900',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export default function ConfiguratorForm({ product, initialWidth, initialHeight }: ConfiguratorFormProps) {
  const router = useRouter()
  const { t } = useLocale()
  const cfg = product.config

  // Banner: auto-select 4/0 print mode, hide Print selector
  const isBanner = cfg?.type === 'BANNER'
  const print40Id = isBanner
    ? (product.options.find((o) => o.name === 'Print')?.values.find((v) => v.name === '4/0')?.id ?? null)
    : null

  const fixedSizeOptions = useMemo<{ label: string; w: number; h: number }[]>(() => {
    if (!cfg?.fixedSizes) return []
    return cfg.fixedSizes.split(',').map((s) => {
      const [w, h] = s.trim().split('x').map(Number)
      return { label: `${w} × ${h} cm`, w, h }
    })
  }, [cfg?.fixedSizes])

  // For products where variant encodes size (e.g. "85 × 200 cm", "A1 (594 × 841 mm)")
  const firstVariantDims = useMemo<{ w: number; h: number } | null>(() => {
    const hasVariants = cfg ? cfg.hasVariants && product.variants.length > 0 : product.variants.length > 0
    const hasCustom = cfg ? cfg.hasCustomSize : true
    if (!hasVariants || hasCustom) return null
    return parseDimsFromVariantName(product.variants[0]?.name ?? '')
  }, [cfg, product.variants])

  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '')
  const [optionValueIds, setOptionValueIds] = useState<string[]>(print40Id ? [print40Id] : [])
  const [width, setWidth] = useState(initialWidth ?? firstVariantDims?.w ?? fixedSizeOptions[0]?.w ?? cfg?.printAreaWidthCm ?? 100)
  const [height, setHeight] = useState(initialHeight ?? firstVariantDims?.h ?? fixedSizeOptions[0]?.h ?? cfg?.printAreaHeightCm ?? 100)
  const [quantity, setQuantity] = useState(1)
  const deliveryType = 'STANDARD' as const
  const [placement, setPlacement] = useState<'front' | 'back'>('front')

  // Price state — manual calculate only (no auto-fetch)
  const [price, setPrice] = useState<PriceResult | null>(null)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [priceCalculated, setPriceCalculated] = useState(false)
  const [calculating, setCalculating] = useState(false)

  // Sync guest session on mount
  useEffect(() => {
    fetch('/api/user/me')
      .then(async (r) => {
        if (r.ok) return r.json()
        const g = await fetch('/api/user/guest', { method: 'POST' })
        if (!g.ok) return null
        return g.json()
      })
      .then((u) => {
        if (u?.id) {
          setSessionUserId(u.id)
          if (u.email) setSessionUserEmail(u.email)
        }
      })
      .catch(() => {})
  }, [])

  const resetPrice = useCallback(() => {
    setPrice(null)
    setPriceError(null)
    setPriceCalculated(false)
  }, [])

  const showPlacement = useMemo(() => cfg?.needsPlacement || (cfg?.placementMode && cfg.placementMode !== 'none'), [cfg])
  const showVariants = useMemo(() => cfg ? cfg.hasVariants && product.variants.length > 0 : product.variants.length > 0, [cfg, product.variants.length])
  const showOptions = useMemo(() => cfg ? cfg.hasOptions && product.options.length > 0 : product.options.length > 0, [cfg, product.options.length])
  const showCustomSize = useMemo(() => cfg ? cfg.hasCustomSize : true, [cfg])
  const showFixedSizes = useMemo(() => cfg ? cfg.hasFixedSizes && fixedSizeOptions.length > 0 : false, [cfg, fixedSizeOptions.length])

  const minW = cfg?.minWidth ?? 1
  const maxW = cfg?.maxWidth ?? 500
  const minH = cfg?.minHeight ?? 1
  const maxH = cfg?.maxHeight ?? 500

  const handleCalculate = async () => {
    setCalculating(true)
    setPrice(null)
    setPriceError(null)
    setPriceCalculated(false)
    try {
      const res = await fetch('/api/configurator/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          variantId: variantId || undefined,
          width: (showCustomSize || showFixedSizes) ? width : undefined,
          height: (showCustomSize || showFixedSizes) ? height : undefined,
          quantity,
          deliveryType,
          optionValueIds,
        }),
      })
      if (res.ok) {
        setPrice(await res.json())
      } else {
        const body = await res.json().catch(() => ({}))
        setPriceError(body.error ?? 'Price not configured for this product')
      }
    } catch {
      setPriceError('Could not connect to pricing service. Please try again.')
    } finally {
      setPriceCalculated(true)
      setCalculating(false)
    }
  }

  const toggleOptionValue = (valueId: string, optionId: string) => {
    const option = product.options.find((o) => o.id === optionId)
    const optionValueSet = new Set(option?.values.map((v) => v.id) ?? [])
    setOptionValueIds((prev) => {
      const withoutThisOption = prev.filter((id) => !optionValueSet.has(id))
      return prev.includes(valueId) ? withoutThisOption : [...withoutThisOption, valueId]
    })
    resetPrice()
  }

  // Can proceed to upload/designer only when price was successfully calculated
  const canProceed = priceCalculated && price !== null

  return (
    <div className="flex flex-col gap-5">
      {showVariants && (
        <label className={labelCls}>
          <span className={labelTextCls}>Variant</span>
          <select value={variantId} onChange={(e) => {
            setVariantId(e.target.value)
            resetPrice()
            if (!showCustomSize) {
              const v = product.variants.find((v) => v.id === e.target.value)
              if (v) {
                const dims = parseDimsFromVariantName(v.name)
                if (dims) { setWidth(dims.w); setHeight(dims.h) }
              }
            }
          }} className={inputCls}>
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>{v.name} — {v.material}</option>
            ))}
          </select>
        </label>
      )}

      {showFixedSizes && (
        <label className={labelCls}>
          <span className={labelTextCls}>Size</span>
          <select
            className={inputCls}
            onChange={(e) => {
              const opt = fixedSizeOptions[Number(e.target.value)]
              if (opt) { setWidth(opt.w); setHeight(opt.h); resetPrice() }
            }}
          >
            {fixedSizeOptions.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>
        </label>
      )}

      {showCustomSize && (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            <span className={labelTextCls}>Width (cm)</span>
            <input type="number" min={minW} max={maxW} value={width} onChange={(e) => { setWidth(Number(e.target.value)); resetPrice() }} className={inputCls} />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Height (cm)</span>
            <input type="number" min={minH} max={maxH} value={height} onChange={(e) => { setHeight(Number(e.target.value)); resetPrice() }} className={inputCls} />
          </label>
        </div>
      )}

      {showOptions && product.options.map((option) => {
        // Banner: replace Print selector with static info text
        if (isBanner && option.name === 'Print') {
          return (
            <div key={option.id} className="flex flex-col gap-1">
              <span className={labelTextCls}>Print</span>
              <p className="text-sm text-gray-500">4/0 — single sided. Upload one-sided artwork only.</p>
            </div>
          )
        }
        return (
          <div key={option.id} className="flex flex-col gap-2">
            <span className={labelTextCls}>{option.name}</span>
            <div className="flex flex-wrap gap-2">
              {option.values.map((val) => (
                <PillButton
                  key={val.id}
                  active={optionValueIds.includes(val.id)}
                  onClick={() => toggleOptionValue(val.id, option.id)}
                >
                  {val.name}
                  {Number(val.priceModifier) !== 0 && (
                    <span className="ml-1 opacity-80">+€{Number(val.priceModifier).toFixed(2)}</span>
                  )}
                </PillButton>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex flex-col gap-1">
        <label className={labelCls}>
          <span className={labelTextCls}>Quantity</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => { setQuantity(Math.max(1, Number(e.target.value))); resetPrice() }}
            className={inputCls}
          />
        </label>
      </div>

      {showPlacement && (
        <div className="flex flex-col gap-2">
          <span className={labelTextCls}>Placement</span>
          <div className="flex gap-2">
            {(['front', 'back'] as const).map((p) => (
              <PillButton key={p} active={placement === p} onClick={() => setPlacement(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </PillButton>
            ))}
          </div>
          <ProductPreview placement={placement} width={width} height={height} />
        </div>
      )}

      {/* ── Calculate Price ── */}
      <button
        type="button"
        onClick={handleCalculate}
        disabled={calculating}
        className="w-full py-3 rounded-lg bg-gray-900 text-white font-semibold text-base hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {calculating ? 'Calculating…' : t.buttons.calculate}
      </button>

      {/* ── Price result ── */}
      {priceCalculated && (
        price ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm flex flex-col gap-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Unit price</span><span>€{price.unitPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span><span>€{price.shippingPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2 mt-0.5">
              <span>Total</span><span>€{price.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {priceError ?? 'Price not configured for this product'}
          </div>
        )
      )}

      {/* ── Upload / Designer — always visible, disabled until price OK ── */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          disabled={!canProceed}
          className="bg-red-600 text-white text-lg py-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          onClick={() => {
            const p = new URLSearchParams({ w: String(width), h: String(height), qty: String(quantity) })
            if (variantId) p.set('variant', variantId)
            if (optionValueIds.length) p.set('opts', optionValueIds.join(','))
            if (showPlacement && placement) p.set('placement', placement)
            router.push(`/upload/${product.id}?${p}`)
          }}
        >
          📤 {t.buttons.upload}
        </button>
        <button
          type="button"
          disabled={!canProceed}
          className="bg-black text-white text-lg py-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          onClick={() => router.push(`/editor/${product.id}?w=${width}&h=${height}`)}
        >
          ✏️ {t.buttons.designer}
        </button>
      </div>
      {!canProceed && (
        <p className="text-xs text-center text-gray-400">{t.buttons.calculate} to continue</p>
      )}
    </div>
  )
}
