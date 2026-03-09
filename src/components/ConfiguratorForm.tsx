'use client'

import { useEffect, useState, useMemo } from 'react'
import Button from '@/components/Button'
import ProductPreview from '@/components/ProductPreview'

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

interface PriceResult {
  unitPrice: number
  totalPrice: number
  shippingPrice: number
}

const inputCls = 'rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-full'
const labelCls = 'flex flex-col gap-1'
const labelTextCls = 'text-sm font-medium text-gray-700'

export default function ConfiguratorForm({ product }: { product: Product }) {
  const cfg = product.config

  const fixedSizeOptions = useMemo<{ label: string; w: number; h: number }[]>(() => {
    if (!cfg?.fixedSizes) return []
    return cfg.fixedSizes.split(',').map((s) => {
      const [w, h] = s.trim().split('x').map(Number)
      return { label: `${w} × ${h} cm`, w, h }
    })
  }, [cfg?.fixedSizes])

  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '')
  const [optionValueIds, setOptionValueIds] = useState<string[]>([])
  const [width, setWidth] = useState(fixedSizeOptions[0]?.w ?? 100)
  const [height, setHeight] = useState(fixedSizeOptions[0]?.h ?? 100)
  const [quantity, setQuantity] = useState(1)
  const [deliveryType, setDeliveryType] = useState<'STANDARD' | 'EXPRESS' | 'PICKUP'>('STANDARD')
  const [price, setPrice] = useState<PriceResult | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [placement, setPlacement] = useState<'front' | 'back'>('front')
  const [userId, setUserId] = useState('')
  const [addedToCart, setAddedToCart] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)

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

  const handleAddToCart = async () => {
    if (!userId) {
      setCartError('Please enter a user ID before adding to cart.')
      return
    }
    setCartError(null)
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        productId: product.id,
        variantId: variantId || undefined,
        width: (showCustomSize || showFixedSizes) ? width : undefined,
        height: (showCustomSize || showFixedSizes) ? height : undefined,
        quantity,
        express: deliveryType === 'EXPRESS',
        optionValueIds,
        placement: showPlacement ? placement : undefined,
      }),
    })
    if (res.ok) {
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 2000)
    } else {
      const body = await res.json().catch(() => ({}))
      setCartError(body.error ?? 'Could not add to cart. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-md">
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

      {showOptions && product.options.map((option) => (
        <div key={option.id} className="flex flex-col gap-1.5">
          <span className={labelTextCls}>{option.name}</span>
          <div className="flex flex-wrap gap-2">
            {option.values.map((val) => (
              <label key={val.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={option.id}
                  checked={optionValueIds.includes(val.id)}
                  onChange={() => toggleOptionValue(val.id, option.id)}
                  className="accent-gray-900"
                />
                {val.name}
                {Number(val.priceModifier) !== 0 && (
                  <span className="text-gray-500">(+€{Number(val.priceModifier).toFixed(2)})</span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

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
          {sizeError && <p className="text-red-600 text-sm">{sizeError}</p>}
        </div>
      )}

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

      <div className="flex flex-col gap-1.5">
        <span className={labelTextCls}>Delivery</span>
        <div className="flex flex-wrap gap-3">
          {(['STANDARD', 'EXPRESS'] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="delivery" checked={deliveryType === type} onChange={() => setDeliveryType(type)} className="accent-gray-900" />
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </label>
          ))}
          {cfg?.pickupAllowed && (
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="delivery" checked={deliveryType === 'PICKUP'} onChange={() => setDeliveryType('PICKUP')} className="accent-gray-900" />
              Pickup
            </label>
          )}
        </div>
      </div>

      {showPlacement && (
        <div className="flex flex-col gap-1.5">
          <span className={labelTextCls}>Placement</span>
          <div className="flex gap-3">
            {(['front', 'back'] as const).map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="placement" checked={placement === p} onChange={() => setPlacement(p)} className="accent-gray-900" />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>
          <ProductPreview placement={placement} width={width} height={height} />
        </div>
      )}

      {price && (
        <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm flex flex-col gap-1">
          <div className="flex justify-between text-gray-600">
            <span>Unit price</span><span>€{price.unitPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span><span>€{price.shippingPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-1">
            <span>Total</span><span>€{price.totalPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      <label className={labelCls}>
        <span className={labelTextCls}>User ID <span className="text-gray-400 font-normal">(temporary)</span></span>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user-id" className={inputCls} />
      </label>

      <div className="flex flex-col gap-2">
        <Button onClick={handleAddToCart} disabled={!!sizeError || quantity < 1}>
          {addedToCart ? 'Added to cart!' : 'Add to cart'}
        </Button>
        {cartError && <p className="text-sm text-red-600">{cartError}</p>}
      </div>
    </div>
  )
}
