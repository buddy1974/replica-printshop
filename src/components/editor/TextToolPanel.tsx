'use client'

// Steps 372–377 — Text tool panel: font, size, color, outline, alignment, style

import type { TextProps } from './EditorCanvas'

// Steps 373 — supported fonts (web-safe + Google Fonts loaded by EditorShell)
const FONTS = [
  'Arial',
  'Helvetica',
  'Impact',
  'Georgia',
  'Courier New',
  'Roboto',
  'Oswald',
]

interface Props {
  textProps: TextProps
  onChange: (props: Partial<TextProps>) => void
  extraFonts?: string[]
}

const inputCls =
  'w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400'

export default function TextToolPanel({ textProps, onChange, extraFonts = [] }: Props) {
  const allFonts = [...FONTS, ...extraFonts.filter((f) => !FONTS.includes(f))]
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Text</p>

      {/* Step 371 — text content */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Content</span>
        <textarea
          value={textProps.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </label>

      {/* Step 373 — font family */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Font</span>
        <select
          value={textProps.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className={inputCls}
          style={{ fontFamily: textProps.fontFamily }}
        >
          {allFonts.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </label>

      {/* Font size */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Size (px)</span>
        <input
          type="number"
          min={6}
          max={300}
          value={textProps.fontSize}
          onChange={(e) => onChange({ fontSize: Math.max(6, Number(e.target.value)) })}
          className={inputCls}
        />
      </label>

      {/* Step 374 — fill color + Step 375 — stroke color */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Color</span>
          <input
            type="color"
            value={textProps.fill || '#000000'}
            onChange={(e) => onChange({ fill: e.target.value })}
            className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Outline</span>
          <input
            type="color"
            value={textProps.stroke || '#000000'}
            onChange={(e) => onChange({ stroke: e.target.value })}
            className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
          />
        </label>
      </div>

      {/* Step 375 — stroke width */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Outline width</span>
        <input
          type="number"
          min={0}
          max={20}
          value={textProps.strokeWidth}
          onChange={(e) => onChange({ strokeWidth: Math.max(0, Number(e.target.value)) })}
          className={inputCls}
        />
      </label>

      {/* Step 376 — text alignment */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Align</span>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => onChange({ textAlign: align })}
              className={[
                'flex-1 py-1.5 rounded text-xs border transition-colors',
                textProps.textAlign === align
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400',
              ].join(' ')}
            >
              {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
            </button>
          ))}
        </div>
      </div>

      {/* Step 377 — bold / italic / uppercase */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Style</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() =>
              onChange({ fontWeight: textProps.fontWeight === 'bold' ? 'normal' : 'bold' })
            }
            className={[
              'flex-1 py-1.5 rounded text-xs border font-bold transition-colors',
              textProps.fontWeight === 'bold'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            B
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ fontStyle: textProps.fontStyle === 'italic' ? 'normal' : 'italic' })
            }
            className={[
              'flex-1 py-1.5 rounded text-xs border italic transition-colors',
              textProps.fontStyle === 'italic'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => onChange({ uppercase: !textProps.uppercase })}
            className={[
              'flex-1 py-1.5 rounded text-xs border transition-colors',
              textProps.uppercase
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            AA
          </button>
        </div>
      </div>
    </div>
  )
}
