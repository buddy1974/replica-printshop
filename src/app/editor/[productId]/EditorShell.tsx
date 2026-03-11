'use client'

// Steps 342+, 421-430 — Editor shell: grid layout, tabs, collapse, mobile warning, loading

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Download, ShoppingCart } from 'lucide-react'
import EditorCanvas, {
  type EditorCanvasHandle,
  type SelectionType,
  type TextProps,
  type ShapeProps,
  type ImageProps,
  type LayerInfo,
  DEFAULT_TEXT_PROPS,
  DEFAULT_SHAPE_PROPS,
  DEFAULT_IMAGE_PROPS,
} from '@/components/editor/EditorCanvas'
import DesignUploadPanel from '@/components/editor/DesignUploadPanel'
import PlacementSelector from '@/components/editor/PlacementSelector'
import EditorToolbar from '@/components/editor/EditorToolbar'
import TextToolPanel from '@/components/editor/TextToolPanel'
import ShapeToolPanel from '@/components/editor/ShapeToolPanel'
import ShapePropsPanel from '@/components/editor/ShapePropsPanel'
import ImageToolPanel from '@/components/editor/ImageToolPanel'
import LayersPanel from '@/components/editor/LayersPanel'
import LogoLibraryPanel from '@/components/editor/LogoLibraryPanel'
import TemplateLibraryPanel from '@/components/editor/TemplateLibraryPanel'
import { getZonesByCategorySlug } from '@/lib/placementZones'
import type { PlacementZone } from '@/lib/placementZones'

interface Product {
  id: string
  name: string
  categorySlug: string
  imageUrl: string | null
  config: {
    type: string
    needsPlacement: boolean
    hasCustomSize: boolean
    printAreaWidthCm: number | null
    printAreaHeightCm: number | null
  } | null
}

interface Props {
  product: Product
  initialWidth?: number | null
  initialHeight?: number | null
}

type CartStatus = 'idle' | 'saving' | 'added' | 'error'
type RightTab = 'text' | 'image' | 'shape' | 'layers'

const RIGHT_TABS: RightTab[] = ['text', 'image', 'shape', 'layers']

export default function EditorShell({ product, initialWidth, initialHeight }: Props) {
  const canvasRef = useRef<EditorCanvasHandle | null>(null)

  const zones = getZonesByCategorySlug(product.categorySlug, product.config?.type)
  const [activeZone, setActiveZone] = useState<PlacementZone | null>(zones[0] ?? null)

  // Selection state
  const [selectedType, setSelectedType] = useState<SelectionType>(null)
  const [textProps, setTextProps] = useState<TextProps>(DEFAULT_TEXT_PROPS)
  const [shapeProps, setShapeProps] = useState<ShapeProps>(DEFAULT_SHAPE_PROPS)
  const [imageProps, setImageProps] = useState<ImageProps>(DEFAULT_IMAGE_PROPS)
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [extraFonts, setExtraFonts] = useState<string[]>([])

  // Step 421 — layout / UI state
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<RightTab>('layers')
  const [canvasReady, setCanvasReady] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileDismissed, setMobileDismissed] = useState(false)
  const [canvasBg, setCanvasBg] = useState('#f3f4f6')

  // Cart state
  const [userId, setUserId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [width, setWidth] = useState<number>(initialWidth ?? product.config?.printAreaWidthCm ?? 0)
  const [height, setHeight] = useState<number>(initialHeight ?? product.config?.printAreaHeightCm ?? 0)
  const [cartStatus, setCartStatus] = useState<CartStatus>('idle')
  const [cartError, setCartError] = useState<string | null>(null)

  // Auto-read userId from cookie
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)replica_uid=([^;]+)/)
    if (match) setUserId(decodeURIComponent(match[1]))
  }, [])

  // Step 421 — mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Step 373 — load Roboto + Oswald from Google Fonts
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Oswald:wght@400;700&display=swap'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  // Step 411 — load custom fonts from manifest via FontFace API
  useEffect(() => {
    fetch('/editor/fonts/manifest.json')
      .then((r) => r.json())
      .then(async (d) => {
        const fonts: Array<{ family: string; file: string }> = d.fonts ?? []
        const loaded: string[] = []
        for (const f of fonts) {
          try {
            const face = new FontFace(f.family, `url(/editor/fonts/${f.file})`)
            await face.load()
            document.fonts.add(face)
            loaded.push(f.family)
          } catch {
            // skip fonts that fail to load
          }
        }
        if (loaded.length > 0) setExtraFonts(loaded)
      })
      .catch(() => {})
  }, [])

  // Step 421 — auto-switch right panel tab when selection changes
  useEffect(() => {
    if (selectedType === 'text') setActiveTab('text')
    else if (selectedType === 'image') setActiveTab('image')
    else if (selectedType === 'shape') setActiveTab('shape')
  }, [selectedType])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleImageReady(url: string) {
    canvasRef.current?.addImage(url)
    if (activeZone) setTimeout(() => canvasRef.current?.fitSelected(activeZone), 80)
  }

  function handleZoneChange(zone: PlacementZone) {
    setActiveZone(zone)
    canvasRef.current?.fitSelected(zone)
  }

  function handleSelectionChange(
    type: SelectionType,
    tp?: TextProps,
    sp?: ShapeProps,
    ip?: ImageProps,
  ) {
    setSelectedType(type)
    if (tp) setTextProps(tp)
    if (sp) setShapeProps(sp)
    if (ip) setImageProps(ip)
  }

  function handleImageChange(props: Partial<ImageProps>) {
    canvasRef.current?.updateSelectedImage(props)
    setImageProps((prev) => ({ ...prev, ...props }))
  }

  function handleShapeChange(props: Partial<ShapeProps>) {
    canvasRef.current?.updateSelectedShape(props)
    setShapeProps((prev) => ({ ...prev, ...props }))
  }

  function handleTextChange(props: Partial<TextProps>) {
    canvasRef.current?.updateSelectedText(props)
    setTextProps((prev) => {
      const next = { ...prev, ...props }
      if ('uppercase' in props && props.uppercase !== undefined) {
        next.text = props.uppercase ? prev.text.toUpperCase() : prev.text
      }
      return next
    })
  }

  function handleReplaceImage(url: string) {
    canvasRef.current?.replaceSelectedImage(url)
  }

  function handleLoadTemplate(json: object) {
    canvasRef.current?.loadTemplate(json)
  }

  function handleBgChange(color: string) {
    setCanvasBg(color)
    canvasRef.current?.setBackground(color)
  }

  function handleSaveTemplate() {
    const json = canvasRef.current?.exportJSON()
    if (!json) return
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const showCustomSize = product.config?.hasCustomSize && !product.config.printAreaWidthCm

  async function handleAddToCart() {
    if (!userId.trim()) { setCartError('Enter a user ID.'); return }
    if (quantity < 1) { setCartError('Quantity must be at least 1.'); return }
    setCartStatus('saving')
    setCartError(null)
    try {
      const canvasJSON = canvasRef.current?.exportJSON() ?? null
      const dataUrl = canvasRef.current?.exportDataURL() ?? null
      if (!canvasJSON) {
        setCartError('Canvas is empty. Add a design or text first.')
        setCartStatus('error')
        return
      }
      const saveRes = await fetch('/api/design/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, data: canvasJSON, previewDataUrl: dataUrl }),
      })
      if (!saveRes.ok) {
        const b = await saveRes.json().catch(() => ({}))
        throw new Error(b.error ?? 'Failed to save design')
      }
      const { id: designId } = await saveRes.json()
      const cartBody: Record<string, unknown> = { userId, productId: product.id, quantity, designId }
      if (showCustomSize && width > 0) cartBody.width = width
      if (showCustomSize && height > 0) cartBody.height = height
      const cartRes = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartBody),
      })
      if (!cartRes.ok) {
        const b = await cartRes.json().catch(() => ({}))
        throw new Error(b.error ?? 'Failed to add to cart')
      }
      setCartStatus('added')
      setTimeout(() => setCartStatus('idle'), 3000)
    } catch (e) {
      setCartError(e instanceof Error ? e.message : 'Something went wrong.')
      setCartStatus('error')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      {/* Step 421 — Mobile warning overlay */}
      {isMobile && !mobileDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 p-6">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center space-y-4 shadow-xl">
            <p className="text-4xl">🖥</p>
            <p className="font-semibold text-gray-800">Editor works best on desktop</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Open this editor on a screen wider than 900 px for the best experience.
            </p>
            <button
              onClick={() => setMobileDismissed(true)}
              className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Continue anyway
            </button>
          </div>
        </div>
      )}

      {/* Step 421 — Top header bar */}
      <header className="h-12 shrink-0 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-10">
        <a
          href="/shop"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={14} />
          Shop
        </a>
        <span className="text-gray-200">|</span>
        <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
          {product.name}
        </span>
        {product.config?.type && (
          <span className="hidden sm:inline-block text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
            {product.config.type}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveTemplate}
            title="Download canvas as template JSON"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Save template</span>
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={cartStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <ShoppingCart size={13} />
            {cartStatus === 'saving' ? 'Saving…' : cartStatus === 'added' ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      </header>

      {/* Step 421 — 3-panel CSS grid */}
      <div
        className="flex-1 min-h-0 grid overflow-hidden"
        style={{
          gridTemplateColumns: `${leftCollapsed ? '40px' : '260px'} 1fr ${rightCollapsed ? '40px' : '320px'}`,
          transition: 'grid-template-columns 0.2s ease',
        }}
      >

        {/* ── Left panel — Assets ── */}
        <aside className="border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {leftCollapsed ? (
            /* Collapsed strip */
            <div className="flex flex-col items-center pt-3">
              <button
                onClick={() => setLeftCollapsed(false)}
                title="Expand assets panel"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 h-9 border-b border-gray-100 shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Assets</span>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  title="Collapse assets panel"
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <DesignUploadPanel onImageReady={handleImageReady} />
                <LogoLibraryPanel onAdd={(url) => canvasRef.current?.addImage(url)} />
                {product.config?.needsPlacement !== false && zones.length > 0 && (
                  <PlacementSelector zones={zones} selected={activeZone} onChange={handleZoneChange} />
                )}
                <TemplateLibraryPanel onLoad={handleLoadTemplate} />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="w-full text-left px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  Save as template ↓
                </button>
              </div>
            </>
          )}
        </aside>

        {/* ── Center — Canvas ── */}
        <main className="relative flex items-center justify-center overflow-auto bg-[#e2e2e2]">
          {/* Step 421 — Loading spinner overlay */}
          {!canvasReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
              <div className="w-9 h-9 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="flex flex-col items-center gap-3 p-6 w-full max-w-2xl">
            <EditorCanvas
              ref={canvasRef}
              mockupUrl={product.imageUrl}
              zone={activeZone}
              onSelectionChange={handleSelectionChange}
              onLayersChange={setLayers}
              onReady={() => setCanvasReady(true)}
            />
            <p className="text-xs text-gray-400 text-center select-none">
              Drag to move · handles to scale · double-click text to edit
            </p>
          </div>
        </main>

        {/* ── Right panel — Properties ── */}
        <aside className="border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {rightCollapsed ? (
            /* Collapsed strip */
            <div className="flex flex-col items-center pt-3">
              <button
                onClick={() => setRightCollapsed(false)}
                title="Expand properties panel"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 h-9 border-b border-gray-100 shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Properties</span>
                <button
                  onClick={() => setRightCollapsed(true)}
                  title="Collapse properties panel"
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Toolbar icon strip */}
              <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
                <EditorToolbar canvasRef={canvasRef} activeZone={activeZone} />
              </div>

              {/* Canvas background picker */}
              <div className="px-3 py-2 border-b border-gray-100 shrink-0 flex items-center gap-2">
                <span className="text-xs text-gray-500 flex-1">Canvas background</span>
                <input
                  type="color"
                  value={canvasBg}
                  onChange={(e) => handleBgChange(e.target.value)}
                  className="w-8 h-6 rounded border border-gray-200 cursor-pointer p-0.5"
                  title="Pick canvas background color"
                />
              </div>

              {/* Step 421 — Tabs: Text | Image | Shape | Layers */}
              <div className="grid grid-cols-4 border-b border-gray-100 shrink-0">
                {RIGHT_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={[
                      'py-2 text-xs capitalize transition-colors',
                      activeTab === tab
                        ? 'text-indigo-600 border-b-2 border-indigo-500 font-semibold'
                        : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content — scrollable */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {activeTab === 'text' && (
                  <TextToolPanel
                    textProps={textProps}
                    onChange={handleTextChange}
                    extraFonts={extraFonts}
                  />
                )}

                {activeTab === 'image' && (
                  <ImageToolPanel
                    imageProps={imageProps}
                    activeZone={activeZone}
                    onChange={handleImageChange}
                    onCrop={() => canvasRef.current?.cropSelected()}
                    onFitToZone={() => activeZone && canvasRef.current?.fitSelected(activeZone)}
                    onCenter={() => canvasRef.current?.centerInZone()}
                    onReset={() => {
                      canvasRef.current?.resetImage()
                      setImageProps(DEFAULT_IMAGE_PROPS)
                    }}
                    onReplace={handleReplaceImage}
                  />
                )}

                {activeTab === 'shape' && (
                  <div className="space-y-4">
                    <ShapeToolPanel
                      onAdd={(type) => {
                        if (type === 'rect') canvasRef.current?.addRect()
                        else if (type === 'circle') canvasRef.current?.addCircle()
                        else if (type === 'triangle') canvasRef.current?.addTriangle()
                        else canvasRef.current?.addLine()
                      }}
                    />
                    {selectedType === 'shape' && (
                      <div className="pt-3 border-t border-gray-100">
                        <ShapePropsPanel shapeProps={shapeProps} onChange={handleShapeChange} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'layers' && (
                  <LayersPanel
                    layers={layers}
                    onSelect={(index) => canvasRef.current?.selectObjectByIndex(index)}
                  />
                )}
              </div>

              {/* Cart section — fixed at bottom of right panel */}
              <div className="border-t border-gray-100 px-3 py-3 space-y-2 shrink-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Order</p>
                {!userId && (
                  <input
                    type="text"
                    placeholder="User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                )}
                <label className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex-1">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </label>
                {showCustomSize && (
                  <div className="flex gap-1.5">
                    <label className="flex flex-col gap-0.5 flex-1">
                      <span className="text-xs text-gray-400">W cm</span>
                      <input
                        type="number"
                        min={1}
                        value={width || ''}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 flex-1">
                      <span className="text-xs text-gray-400">H cm</span>
                      <input
                        type="number"
                        min={1}
                        value={height || ''}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </label>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={cartStatus === 'saving'}
                  className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cartStatus === 'saving' ? 'Saving…' : cartStatus === 'added' ? 'Added!' : 'Add to Cart'}
                </button>
                {cartStatus === 'added' && (
                  <p className="text-xs text-green-600">
                    Saved.{' '}
                    <a href={`/cart?userId=${encodeURIComponent(userId)}`} className="underline">
                      View cart
                    </a>
                  </p>
                )}
                {cartError && <p className="text-xs text-red-600">{cartError}</p>}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
