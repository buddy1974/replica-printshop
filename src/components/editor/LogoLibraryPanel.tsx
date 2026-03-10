'use client'

// Step 414 — Logo library panel: load PNGs from /public/editor/logos/, click to add

import { useState, useEffect } from 'react'

interface Logo {
  name: string
  file: string
}

interface Props {
  onAdd: (url: string) => void
}

export default function LogoLibraryPanel({ onAdd }: Props) {
  const [logos, setLogos] = useState<Logo[]>([])

  useEffect(() => {
    fetch('/editor/logos/manifest.json')
      .then((r) => r.json())
      .then((d) => setLogos(d.logos ?? []))
      .catch(() => {})
  }, [])

  if (logos.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Logo Library</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Add PNG/SVG files + update{' '}
          <code className="bg-gray-100 px-0.5 rounded">/public/editor/logos/manifest.json</code>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Logo Library</p>
      <div className="grid grid-cols-2 gap-1.5">
        {logos.map((logo) => (
          <button
            key={logo.file}
            type="button"
            onClick={() => onAdd(`/editor/logos/${logo.file}`)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-400 transition-colors"
          >
            <img
              src={`/editor/logos/${logo.file}`}
              alt={logo.name}
              className="w-full max-h-10 object-contain"
            />
            <span className="text-[10px] text-gray-500 truncate w-full text-center">
              {logo.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
