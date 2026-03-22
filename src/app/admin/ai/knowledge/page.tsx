'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'

interface Entry {
  id: string
  title: string
  content: string
  category: string
  active: boolean
  createdAt: string
}

interface EditState {
  title: string
  content: string
  category: string
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add form
  const [addTitle, setAddTitle] = useState('')
  const [addContent, setAddContent] = useState('')
  const [addCategory, setAddCategory] = useState('general')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', content: '', category: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/knowledge')
      const data = await res.json() as Entry[]
      setEntries(data)
    } catch {
      setError('Failed to load entries')
    } finally {
      setLoading(false)
    }
  }

  async function add() {
    if (!addTitle.trim() || !addContent.trim()) {
      setAddError('Title and content are required')
      return
    }
    setAdding(true)
    setAddError(null)
    const res = await fetch('/api/admin/ai/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: addTitle, content: addContent, category: addCategory }),
    })
    setAdding(false)
    if (res.ok) {
      const entry = await res.json() as Entry
      setEntries((prev) => [entry, ...prev])
      setAddTitle('')
      setAddContent('')
      setAddCategory('general')
    } else {
      const d = await res.json()
      setAddError(d.error ?? 'Failed to add entry')
    }
  }

  function startEdit(entry: Entry) {
    setEditId(entry.id)
    setEditState({ title: entry.title, content: entry.content, category: entry.category })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/ai/knowledge/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editState),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json() as Entry
      setEntries((prev) => prev.map((e) => e.id === id ? updated : e))
      setEditId(null)
    }
  }

  async function toggleActive(entry: Entry) {
    const res = await fetch(`/api/admin/ai/knowledge/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !entry.active }),
    })
    if (res.ok) {
      const updated = await res.json() as Entry
      setEntries((prev) => prev.map((e) => e.id === entry.id ? updated : e))
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this knowledge entry? This cannot be undone.')) return
    const res = await fetch(`/api/admin/ai/knowledge/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    }
  }

  return (
    <Container>
      <div className="mb-6">
        <Link href="/admin/ai" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← AI Configuration
        </Link>
        <h1 className="mt-1">Knowledge Base</h1>
        <p className="text-xs text-gray-400 mt-0.5">Custom entries injected into the AI system prompt</p>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Add entry</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
            <input
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="e.g. Express turnaround policy"
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <input
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value)}
              placeholder="general"
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Content</label>
          <textarea
            value={addContent}
            onChange={(e) => setAddContent(e.target.value)}
            rows={4}
            placeholder="Enter the knowledge content to inject into the AI prompt…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y"
          />
        </div>
        {addError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{addError}</p>
        )}
        <button
          onClick={add}
          disabled={adding}
          className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add entry'}
        </button>
      </div>

      {/* Entries table */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No entries yet — add one above</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Title</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Category</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Status</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) =>
                editId === entry.id ? (
                  <tr key={entry.id} className="border-b border-gray-100 bg-gray-50">
                    <td className="px-5 py-3" colSpan={4}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                          <input
                            value={editState.title}
                            onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                            className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                          <input
                            value={editState.category}
                            onChange={(e) => setEditState((s) => ({ ...s, category: e.target.value }))}
                            className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Content</label>
                        <textarea
                          value={editState.content}
                          onChange={(e) => setEditState((s) => ({ ...s, content: e.target.value }))}
                          rows={4}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void saveEdit(entry.id)}
                          disabled={saving}
                          className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="px-4 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{entry.title}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{entry.category}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => void toggleActive(entry)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                          entry.active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {entry.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(entry)}
                          className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void remove(entry.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </Container>
  )
}
