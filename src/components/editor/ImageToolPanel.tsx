'use client'

// Steps 392–399, 416 — Image tool panel: rotate, flip, opacity, scale, crop, fit, center, reset, replace

import { useRef } from 'react'
import type { ImageProps } from './EditorCanvas'

interface Props {
  imageProps: ImageProps
  onChange: (props: Partial<ImageProps>) => void
  onCrop: () => void
  onFitToZone: () => void
  onCenter: () => void
  onReset: () => void
  onReplace: (url: string) => void
}

const inputCls =
  'w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400'

const btnNormal =
  'w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 text-left hover:border-indigo-400 hover:text-indigo-600 transition-colors'

const btnActive =
  'w-full px-2 py-1.5 rounded-lg border border-indigo-500 bg-indigo-50 text-xs text-indigo-700 font-medium text-left transition-colors'

export default function ImageToolPanel({ imageProps, onChange, onCrop, onFitToZone, onCenter, onReset, onReplace }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      if (url) onReplace(url)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Image</p>

      {/* Step 392 — Rotate */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">Rotate</span>
          <span className="text-xs text-gray-400 tabular-nums">{imageProps.angle}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={imageProps.angle}
          onChange={(e) => onChange({ angle: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Step 394 — Opacity */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">Opacity</span>
          <span className="text-xs text-gray-400 tabular-nums">{imageProps.opacity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={imageProps.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Step 393 — Flip */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Flip</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ flipX: !imageProps.flipX })}
            className={[
              'flex-1 py-1.5 rounded text-xs border transition-colors',
              imageProps.flipX
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            Flip H
          </button>
          <button
            type="button"
            onClick={() => onChange({ flipY: !imageProps.flipY })}
            className={[
              'flex-1 py-1.5 rounded text-xs border transition-colors',
              imageProps.flipY
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            Flip V
          </button>
        </div>
      </div>

      {/* Step 395 — Scale */}
      {imageProps.width > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Size (px)</span>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400">W</span>
              <input
                type="number"
                min={1}
                value={imageProps.width}
                onChange={(e) => onChange({ width: Math.max(1, Number(e.target.value)) })}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400">H</span>
              <input
                type="number"
                min={1}
                value={imageProps.height}
                onChange={(e) => onChange({ height: Math.max(1, Number(e.target.value)) })}
                className={inputCls}
              />
            </label>
          </div>
        </div>
      )}

      {/* Step 396 — Crop to zone */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onCrop}
          className={imageProps.cropActive ? btnActive : btnNormal}
        >
          {imageProps.cropActive ? 'Remove crop' : 'Crop to zone'}
        </button>

        {/* Step 397 — Fit to design area */}
        <button type="button" onClick={onFitToZone} className={btnNormal}>
          Fit to design area
        </button>

        {/* Step 398 — Center in design area */}
        <button type="button" onClick={onCenter} className={btnNormal}>
          Center in design area
        </button>

        {/* Step 399 — Reset */}
        <button type="button" onClick={onReset} className={btnNormal}>
          Reset image
        </button>

        {/* Step 416 — Replace image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={btnNormal}
        >
          Replace image…
        </button>
      </div>
    </div>
  )
}
