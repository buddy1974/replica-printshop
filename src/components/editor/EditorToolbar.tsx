'use client'

// Step 348 — Canvas action toolbar: remove selection, fit in zone, clear all

import type { PlacementZone } from '@/lib/placementZones'
import type { EditorCanvasHandle } from './EditorCanvas'

interface Props {
  canvasRef: React.RefObject<EditorCanvasHandle | null>
  activeZone: PlacementZone | null
}

export default function EditorToolbar({ canvasRef, activeZone }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tools</p>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (activeZone) canvasRef.current?.fitSelected(activeZone)
          }}
          disabled={!activeZone}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          Fit to zone
        </button>

        <button
          type="button"
          onClick={() => canvasRef.current?.removeSelected()}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-red-400 hover:text-red-600 transition-colors text-left"
        >
          Remove selected
        </button>

        <button
          type="button"
          onClick={() => canvasRef.current?.clearDesigns()}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-red-400 hover:text-red-600 transition-colors text-left"
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
