'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ProductPreview from '@/components/ProductPreview'
import { setUserId as setSessionUserId, setUserEmail as setSessionUserEmail } from '@/lib/session'

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

const inputCls = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-full'
const labelCls = 'flex flex-col gap-1'
const labelTextCls = 'text-sm font-medium text-gray-700'

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

  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '')
  const [optionValueIds, setOptionValueIds] = useState<string[]>(print40Id ? [print40Id] : [])
  const [width, setWidth] = useState(initialWidth ?? fixedSizeOptions[0]?.w ?? cfg?.printAreaWidthCm ?? 100)
  const [height, setHeight] = useState(initialHeight ?? fixedSizeOptions[0]?.h ?? cfg?.printAreaHeightCm ?? 100)
  const [quantity, setQuantity] = useState(1)
  const [deliveryType, setDeliveryType] = useState<'STANDARD' | 'EXPRESS' | 'PICKUP'>('STANDARD')
  const [price, setPrice] = useState<PriceResult | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [placement, setPlacement] = useState<'front' | 'back'>('front')

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

  const showPlacement = useMemo(() => cfg?.needsPlacement || (cfg?.placementMode && cfg.placementMode !== 'none'), [cfg])
  const showVariants = useMemo(() => cfg ? cfg.hasVariants && product.variants.length > 0 : product.variants.length > 0, [cfg, product.variants.length])
  const showOptions = useMemo(() => cfg ? cfg.hasOptions && product.options.length > 0 : product.options.length > 0, [cfg, product.options.length])
  const showCustomSize = useMemo(() => cfg ? cfg.hasCustomSize : true, [cfg])
  const showFixedSizes = useMemo(() => cfg ? cfg.hasFixedSizes && fixedSizeOptions.length > 0 : false, [cfg, fixedSizeOptions.length])

  const minW = cfg?.minWidth ?? 1
  const maxW = cfg?.maxWidth ?? 500
  const minH = cfg?.minHeight ?? 1
  const maxH = cfg?.maxHeight ?? 500

  useEffect(() => {
    const fetchPrice = async () => {
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
        setSizeError(null)
        setPrice(await res.json())
      } else {
        const body = await res.json().catch(() => ({}))
        setSizeError(body.error ?? 'Invalid size')
        setPrice(null)
      }
    }
    fetchPrice()
  }, [product.id, variantId, optionValueIds, width, height, quantity, deliveryType, showCustomSize, showFixedSizes])

  const toggleOptionValue = (valueId: string, optionId: string) => {
    const option = product.options.find((o) => o.id === optionId)
    const optionValueSet = new Set(option?.values.map((v) => v.id) ?? [])
    setOptionValueIds((prev) => {
      const withoutThisOption = prev.filter((id) => !optionValueSet.has(id))
      return prev.includes(valueId) ? withoutThisOption : [...withoutThisOption, valueId]
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {showVariants && (
        <label className={labelCls}>
          <span className={labelTextCls}>Variant</span>
          <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={inputCls}>
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
              if (opt) { setWidth(opt.w); setHeight(opt.h) }
            }}
          >
            {fixedSizeOptions.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>
        </label>
      )}

      {showCustomSize && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              <span className={labelTextCls}>Width (cm)</span>
              <input type="number" min={minW} max={maxW} value={width} onChange={(e) => setWidth(Number(e.target.value))} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span className={labelTextCls}>Height (cm)</span>
              <input type="number" min={minH} max={maxH} value={height} onChange={(e) => setHeight(Number(e.target.value))} className={inputCls} />
            </label>
          </div>
        </div>
      )}

      {sizeError && <p className="text-red-600 text-sm">{sizeError}</p>}

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
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className={inputCls}
          />
        </label>
        {quantity < 1 && <p className="text-sm text-red-600">Quantity must be at least 1.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelTextCls}>Delivery</span>
        <div className="flex flex-wrap gap-2">
          {(['STANDARD', 'EXPRESS'] as const).map((type) => (
            <PillButton key={type} active={deliveryType === type} onClick={() => setDeliveryType(type)}>
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </PillButton>
          ))}
          {cfg?.pickupAllowed && (
            <PillButton active={deliveryType === 'PICKUP'} onClick={() => setDeliveryType('PICKUP')}>
              Pickup
            </PillButton>
          )}
        </div>
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

      {price && (
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
      )}

      {width > 0 && height > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            className="bg-red-600 text-white text-lg py-4 rounded-lg flex items-center justify-center gap-2"
            onClick={() => {
              const p = new URLSearchParams({ w: String(width), h: String(height), qty: String(quantity) })
              if (variantId) p.set('variant', variantId)
              if (optionValueIds.length) p.set('opts', optionValueIds.join(','))
              if (showPlacement && placement) p.set('placement', placement)
              if (deliveryType === 'EXPRESS') p.set('express', '1')
              router.push(`/upload/${product.id}?${p}`)
            }}
          >
            📤 Upload print file
          </button>
          <button
            className="bg-black text-white text-lg py-4 rounded-lg flex items-center justify-center gap-2"
            onClick={() => { router.push(`/editor/${product.id}?w=${width}&h=${height}`) }}
          >
            ✏️ Use online designer
          </button>
        </div>
      )}

    </div>
  )
}
