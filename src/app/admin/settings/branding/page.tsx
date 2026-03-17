'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'

interface Fields {
  'branding.logoUrl':      string
  'branding.faviconUrl':   string
  'branding.footerText':   string
  'branding.primaryColor': string
}

const DEFAULTS: Fields = {
  'branding.logoUrl':      '',
  'branding.faviconUrl':   '',
  'branding.footerText':   '© PRINTSHOP. All rights reserved.',
  'branding.primaryColor': '#dc2626',
}

const IC = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

export default function BrandingSettingsPage() {
  const [fields, setFields] = useState<Fields>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setFields((prev) => {
          const next = { ...prev }
          for (const k of Object.keys(prev) as (keyof Fields)[]) {
            if (data[k] !== undefined) next[k] = data[k]
          }
          return next
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [k]: e.target.value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Save failed')
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/settings" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← Settings
          </Link>
          <h1 className="mt-1">Branding</h1>
          <p className="text-xs text-gray-400 mt-0.5">Logo, favicon, footer text and primary color</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">Identity</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Logo URL</label>
            <input
              value={fields['branding.logoUrl']}
              onChange={set('branding.logoUrl')}
              placeholder="https://example.com/logo.png"
              className={IC}
            />
            <p className="text-xs text-gray-400 mt-1">Replaces the default mark + text logo in the header</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Favicon URL</label>
            <input
              value={fields['branding.faviconUrl']}
              onChange={set('branding.faviconUrl')}
              placeholder="https://example.com/favicon.ico"
              className={IC}
            />
            <p className="text-xs text-gray-400 mt-1">Browser tab icon (leave blank to use /favicon.svg)</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Footer copyright text</label>
            <input
              value={fields['branding.footerText']}
              onChange={set('branding.footerText')}
              placeholder="© 2026 PRINTSHOP. All rights reserved."
              className={IC}
            />
            <p className="text-xs text-gray-400 mt-1">Shown in the footer bottom bar</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Primary color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fields['branding.primaryColor'] || '#dc2626'}
                onChange={set('branding.primaryColor')}
                className="h-9 w-14 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                value={fields['branding.primaryColor']}
                onChange={set('branding.primaryColor')}
                placeholder="#dc2626"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Stored for reference — visual theming uses CSS</p>
          </div>
        </div>
      </div>

      {fields['branding.logoUrl'] && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Logo preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fields['branding.logoUrl']}
            alt="Logo preview"
            className="h-10 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-xs text-gray-500 space-y-1 max-w-md">
        <p className="font-semibold text-gray-700">Notes</p>
        <p>Logo and favicon URLs must be publicly accessible (served from your domain or a CDN).</p>
        <p>Changes take effect after the next page render (cached for 5 minutes).</p>
      </div>
    </Container>
  )
}
