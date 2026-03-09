'use client'

// Step 347 — Zone picker: renders a button per placement zone

import type { PlacementZone } from '@/lib/placementZones'

interface Props {
  zones: PlacementZone[]
  selected: PlacementZone | null
  onChange: (zone: PlacementZone) => void
}

export default function PlacementSelector({ zones, selected, onChange }: Props) {
  if (zones.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Placement Zone</p>
      <div className="flex flex-col gap-1.5">
        {zones.map((zone) => {
          const active = selected?.id === zone.id
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onChange(zone)}
              className={[
                'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                active
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
              ].join(' ')}
            >
              {zone.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
