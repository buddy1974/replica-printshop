'use client'

// Step 415 — Template library panel: load JSON templates from /public/editor/templates/

import { useState, useEffect } from 'react'

interface Template {
  name: string
  file: string
}

interface Props {
  onLoad: (json: object) => void
}

export default function TemplateLibraryPanel({ onLoad }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    fetch('/editor/templates/manifest.json')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {})
  }, [])

  async function loadTemplate(file: string) {
    try {
      const res = await fetch(`/editor/templates/${file}`)
      const json = await res.json()
      onLoad(json)
    } catch {
      // silent fail
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Templates</p>
      {templates.length === 0 ? (
        <p className="text-xs text-gray-400 leading-relaxed">
          Add JSON files + update{' '}
          <code className="bg-gray-100 px-0.5 rounded">/public/editor/templates/manifest.json</code>
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {templates.map((t) => (
            <button
              key={t.file}
              type="button"
              onClick={() => loadTemplate(t.file)}
              className="w-full text-left px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
