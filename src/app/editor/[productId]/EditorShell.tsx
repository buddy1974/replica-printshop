'use client'

// Steps 342, 343 — Editor shell: 3-panel layout + orchestration

import { useRef, useState } from 'react'
import EditorCanvas, { type EditorCanvasHandle } from '@/components/editor/EditorCanvas'
import DesignUploadPanel from '@/components/editor/DesignUploadPanel'
import PlacementSelector from '@/components/editor/PlacementSelector'
import EditorToolbar from '@/components/editor/EditorToolbar'
import { getZones } from '@/lib/placementZones'
import type { PlacementZone } from '@/lib/placementZones'

interface Product {
  id: string
  name: string
  imageUrl: string | null
  config: {
    type: string
    needsPlacement: boolean
  } | null
}

interface Props {
  product: Product
}

export default function EditorShell({ product }: Props) {
  const canvasRef = useRef<EditorCanvasHandle | null>(null)
  const zones = getZones(product.config?.type ?? 'BANNER')
  const [activeZone, setActiveZone] = useState<PlacementZone | null>(zones[0] ?? null)

  function handleImageReady(url: string) {
    canvasRef.current?.addImage(url)
    // Auto-fit to zone after a short tick to let Fabric settle
    if (activeZone) {
      setTimeout(() => canvasRef.current?.fitSelected(activeZone), 80)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <a href="/shop" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Shop
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-800">{product.name}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          Design Editor
        </span>
      </div>

      {/* 3-panel layout */}
      <div className="flex h-[calc(100vh-52px)]">
        {/* Left panel — upload + placement */}
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4 space-y-6 overflow-y-auto">
          <DesignUploadPanel onImageReady={handleImageReady} />

          {product.config?.needsPlacement !== false && zones.length > 0 && (
            <PlacementSelector
              zones={zones}
              selected={activeZone}
              onChange={setActiveZone}
            />
          )}
        </aside>

        {/* Center panel — canvas */}
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <div className="flex flex-col items-center gap-4 w-full max-w-xl">
            {/* Step 349 — mockup preview behind canvas */}
            <EditorCanvas
              ref={canvasRef}
              mockupUrl={product.imageUrl}
              zone={activeZone}
            />
            <p className="text-xs text-gray-400">
              Drag and resize your design. Use placement zones to align precisely.
            </p>
          </div>
        </main>

        {/* Right panel — tools */}
        <aside className="w-52 shrink-0 border-l border-gray-200 bg-white p-4 space-y-6 overflow-y-auto">
          <EditorToolbar canvasRef={canvasRef} activeZone={activeZone} />

          {/* Product info */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</p>
            <p className="text-sm text-gray-700 font-medium leading-snug">{product.name}</p>
            {product.config?.type && (
              <span className="inline-block text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                {product.config.type}
              </span>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
