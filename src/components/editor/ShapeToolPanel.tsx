'use client'

// Step 381 — Shape tool panel: rect, circle, triangle, line

interface Props {
  onAdd: (type: 'rect' | 'circle' | 'triangle' | 'line') => void
}

const btnCls =
  'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 text-left hover:border-indigo-400 hover:text-indigo-600 transition-colors'

export default function ShapeToolPanel({ onAdd }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shapes</p>
      <div className="flex flex-col gap-1.5">
        <button type="button" onClick={() => onAdd('rect')} className={btnCls}>
          Rectangle
        </button>
        <button type="button" onClick={() => onAdd('circle')} className={btnCls}>
          Circle
        </button>
        <button type="button" onClick={() => onAdd('triangle')} className={btnCls}>
          Triangle
        </button>
        <button type="button" onClick={() => onAdd('line')} className={btnCls}>
          Line
        </button>
      </div>
    </div>
  )
}
