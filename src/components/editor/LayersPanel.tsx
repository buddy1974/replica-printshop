'use client'

// Step 406 — Layers panel: shows canvas objects, allows click-to-select

import type { LayerInfo } from './EditorCanvas'

interface Props {
  layers: LayerInfo[]
  onSelect: (index: number) => void
}

const TYPE_LABEL: Record<string, string> = {
  image: 'Img',
  textbox: 'T',
  text: 'T',
  'i-text': 'T',
  rect: '▭',
  circle: '○',
  triangle: '△',
  line: '—',
  group: '⊞',
}

export default function LayersPanel({ layers, onSelect }: Props) {
  if (layers.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Layers</p>
      <div className="flex flex-col gap-0.5">
        {layers.map((layer) => (
          <button
            key={`${layer.index}-${layer.type}`}
            type="button"
            onClick={() => onSelect(layer.index)}
            className={[
              'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors text-left w-full',
              layer.selected
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-300 hover:text-gray-900',
              layer.locked ? 'opacity-60' : '',
            ].join(' ')}
          >
            <span className="w-5 shrink-0 text-center font-mono text-gray-400 text-[10px]">
              {TYPE_LABEL[layer.type] ?? '?'}
            </span>
            <span className="truncate flex-1 text-[11px]">{layer.label}</span>
            {layer.locked && (
              <span className="text-[9px] text-gray-400 shrink-0 uppercase">lk</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
