'use client'

// Steps 383–387 — Shape properties panel: fill, stroke, stroke width, lock

import type { ShapeProps } from './EditorCanvas'

interface Props {
  shapeProps: ShapeProps
  onChange: (props: Partial<ShapeProps>) => void
}

const inputCls =
  'w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400'

export default function ShapePropsPanel({ shapeProps, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shape</p>

      {/* Step 383 — fill + stroke colors */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Fill</span>
          <input
            type="color"
            value={shapeProps.fill || '#000000'}
            onChange={(e) => onChange({ fill: e.target.value })}
            className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Stroke</span>
          <input
            type="color"
            value={shapeProps.stroke || '#000000'}
            onChange={(e) => onChange({ stroke: e.target.value })}
            className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
          />
        </label>
      </div>

      {/* Step 384 — stroke width */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Stroke width</span>
        <input
          type="number"
          min={0}
          max={20}
          value={shapeProps.strokeWidth}
          onChange={(e) => onChange({ strokeWidth: Math.max(0, Number(e.target.value)) })}
          className={inputCls}
        />
      </label>

      {/* Step 386 — lock toggle */}
      <button
        type="button"
        onClick={() => onChange({ locked: !shapeProps.locked })}
        className={[
          'w-full py-1.5 rounded text-xs border transition-colors',
          shapeProps.locked
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
        ].join(' ')}
      >
        {shapeProps.locked ? 'Locked' : 'Lock'}
      </button>
    </div>
  )
}
