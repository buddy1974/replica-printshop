'use client'

// Steps 348, 371, 379, 421 — Canvas action toolbar with lucide-react icons

import {
  Type,
  Maximize2,
  ArrowUp,
  ArrowDown,
  Layers,
  Scissors,
  Lock,
  Copy,
  Trash2,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react'
import type { EditorCanvasHandle } from './EditorCanvas'

interface Props {
  canvasRef: React.RefObject<EditorCanvasHandle | null>
}

const row = 'flex gap-1'
const btn =
  'flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-xs transition-colors'
const normal = `${btn} border-gray-200 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600`
const danger = `${btn} border-gray-200 bg-white text-gray-700 hover:border-red-400 hover:text-red-600`
const muted = `${btn} border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed`

export default function EditorToolbar({ canvasRef }: Props) {
  return (
    <div className="space-y-1">
      <div className={row}>
        <button
          type="button"
          onClick={() => canvasRef.current?.addText()}
          className={normal}
          title="Add text"
        >
          <Type size={12} /><span className="truncate">Text</span>
        </button>
        <button
          type="button"
          onClick={() => canvasRef.current?.fitSelected()}
          className={normal}
          title="Fit to design area"
        >
          <Maximize2 size={12} /><span className="truncate">Fit</span>
        </button>
      </div>

      <div className={row}>
        <button
          type="button"
          onClick={() => canvasRef.current?.bringForward()}
          className={normal}
          title="Bring to front"
        >
          <ArrowUp size={12} /><span className="truncate">Front</span>
        </button>
        <button
          type="button"
          onClick={() => canvasRef.current?.sendBackward()}
          className={normal}
          title="Send to back"
        >
          <ArrowDown size={12} /><span className="truncate">Back</span>
        </button>
      </div>

      <div className={row}>
        <button
          type="button"
          onClick={() => canvasRef.current?.groupSelected()}
          className={normal}
          title="Group selected objects"
        >
          <Layers size={12} /><span className="truncate">Group</span>
        </button>
        <button
          type="button"
          onClick={() => canvasRef.current?.ungroupSelected()}
          className={normal}
          title="Ungroup"
        >
          <Scissors size={12} /><span className="truncate">Split</span>
        </button>
      </div>

      <div className={row}>
        <button
          type="button"
          onClick={() => canvasRef.current?.toggleLockSelected()}
          className={normal}
          title="Lock / Unlock selected"
        >
          <Lock size={12} /><span className="truncate">Lock</span>
        </button>
        <button
          type="button"
          onClick={() => canvasRef.current?.duplicateSelected()}
          className={normal}
          title="Duplicate selected"
        >
          <Copy size={12} /><span className="truncate">Dupe</span>
        </button>
      </div>

      <div className={row}>
        <button
          type="button"
          onClick={() => canvasRef.current?.removeSelected()}
          className={danger}
          title="Remove selected"
        >
          <Trash2 size={12} /><span className="truncate">Del</span>
        </button>
        <button
          type="button"
          onClick={() => canvasRef.current?.clearDesigns()}
          className={danger}
          title="Clear all objects"
        >
          <Eraser size={12} /><span className="truncate">Clear</span>
        </button>
      </div>

      {/* Undo / Redo — visual stubs, not yet implemented */}
      <div className={row}>
        <button type="button" disabled className={muted} title="Undo (not yet available)">
          <Undo2 size={12} /><span className="truncate">Undo</span>
        </button>
        <button type="button" disabled className={muted} title="Redo (not yet available)">
          <Redo2 size={12} /><span className="truncate">Redo</span>
        </button>
      </div>
    </div>
  )
}
