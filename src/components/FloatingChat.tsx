'use client'

import { useState, useRef, useEffect } from 'react'
import { BRANDING } from '@/config/branding'

const MOCK_REPLIES = [
  'Our standard turnaround is 1–3 business days.',
  'We offer DTF, Flex, Sublimation, Banners, Signs and Graphic Installation.',
  'You can upload your design or use our online editor.',
  'We ship within Germany and EU. Pickup also available.',
  'Contact us at info@printshop.de for custom jobs and large orders.',
  'Minimum order is 1 piece on most products.',
]

interface Message {
  from: 'user' | 'bot'
  text: string
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: `Hi! I'm the ${BRANDING.name} assistant. How can I help you today?` },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = () => {
    const text = input.trim()
    if (!text) return
    setMessages((prev) => [...prev, { from: 'user', text }])
    setInput('')
    setTimeout(() => {
      const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
      setMessages((prev) => [...prev, { from: 'bot', text: reply }])
    }, 700)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      {open && (
        <div className="w-80 rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col" style={{ height: '22rem' }}>
          {/* Header */}
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-semibold">{BRANDING.name} assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={[
                    'max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed',
                    msg.from === 'user'
                      ? 'bg-gray-900 text-white rounded-br-sm'
                      : 'bg-white text-gray-700 border border-gray-200 rounded-bl-sm',
                  ].join(' ')}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="flex-1 text-sm rounded-lg border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
            />
            <button
              type="button"
              onClick={send}
              className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shrink-0"
              aria-label="Send"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  )
}
