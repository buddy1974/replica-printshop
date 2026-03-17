'use client'

import { useState } from 'react'

type State = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactForm() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState]     = useState<State>('idle')
  const [errMsg, setErrMsg]   = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    setErrMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? 'Something went wrong.'); setState('error'); return }
      setState('sent')
    } catch {
      setErrMsg('Network error — please try again.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <p className="font-semibold text-green-800 mb-1">Message sent!</p>
        <p className="text-sm text-green-700">We will reply within 1 business day. Check your inbox for a confirmation.</p>
      </div>
    )
  }

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={field}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={field}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Custom banner order"
          className={field}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Message *</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your project, size, quantity, deadline…"
          className={`${field} resize-y`}
        />
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errMsg}</p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="px-6 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
