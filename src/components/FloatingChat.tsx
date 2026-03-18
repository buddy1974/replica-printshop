'use client'

import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Language = 'en' | 'de' | 'fr'

interface FileData {
  name: string
  type: string
  size: number
  isImage: boolean
  base64?: string
}

interface Message {
  from: 'user' | 'bot'
  text: string
  file?: FileData
}

// ---------------------------------------------------------------------------
// Markdown renderer — handles [text](url) links + line breaks
// ---------------------------------------------------------------------------

function MessageText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > last) {
      const chunk = text.slice(last, match.index)
      chunk.split('\n').forEach((line, i) => {
        if (i > 0) parts.push(<br key={key++} />)
        if (line) parts.push(<span key={key++}>{line}</span>)
      })
    }
    const href = match[2]
    const isExternal = href.startsWith('http')
    parts.push(
      <a
        key={key++}
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="underline text-red-600 hover:text-red-700 font-medium"
        onClick={(e) => {
          if (!isExternal) {
            e.preventDefault()
            window.location.href = href
          }
        }}
      >
        {match[1]}
      </a>,
    )
    last = match.index + match[0].length
  }

  if (last < text.length) {
    text
      .slice(last)
      .split('\n')
      .forEach((line, i) => {
        if (i > 0) parts.push(<br key={key++} />)
        if (line) parts.push(<span key={key++}>{line}</span>)
      })
  }

  return <span>{parts}</span>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANG_LABELS: Record<Language, string> = { en: 'EN', de: 'DE', fr: 'FR' }

const GREETING: Record<Language, string> = {
  en: `Hi! I'm Print Expert, your AI print advisor. I can help you choose the right product, check your design files, advise on materials, and guide you through ordering. How can I help?`,
  de: `Hallo! Ich bin Print Expert, Ihr KI-Druckberater. Ich helfe bei Produktauswahl, Dateiprüfung, Materialberatung und Bestellprozess. Wie kann ich Ihnen helfen?`,
  fr: `Bonjour! Je suis Print Expert, votre conseiller IA en impression. Je vous aide à choisir le bon produit, vérifier vos fichiers, conseiller sur les matériaux et guider votre commande. Comment puis-je vous aider?`,
}

const PLACEHOLDER: Record<Language, string> = {
  en: 'Ask about products, files, pricing…',
  de: 'Fragen zu Produkten, Dateien, Preisen…',
  fr: 'Questions sur produits, fichiers, prix…',
}

const ERROR_MSG: Record<Language, string> = {
  en: 'Sorry, an error occurred. Please try again.',
  de: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  fr: 'Désolé, une erreur est survenue. Veuillez réessayer.',
}

// ---------------------------------------------------------------------------
// Typing dots
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <span className="flex gap-1 items-center py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: GREETING.en }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingFile, setPendingFile] = useState<FileData | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const switchLanguage = (lang: Language) => {
    setLanguage(lang)
    setMessages([{ from: 'bot', text: GREETING[lang] }])
    setPendingFile(null)
    setInput('')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setMessages((prev) => [...prev, { from: 'bot', text: data.error ?? 'File upload failed.' }])
        return
      }
      setPendingFile(data)
    } catch {
      setMessages((prev) => [...prev, { from: 'bot', text: 'File upload failed. Please try again.' }])
    } finally {
      setUploadingFile(false)
    }
  }

  const send = async () => {
    const text = input.trim()
    if ((!text && !pendingFile) || loading) return

    const displayText = text || `[File attached: ${pendingFile!.name}]`
    const fileToSend = pendingFile

    // Add user message + empty bot placeholder
    const newUserMsg: Message = { from: 'user', text: displayText, file: fileToSend ?? undefined }
    setMessages((prev) => [...prev, newUserMsg, { from: 'bot', text: '' }])
    setInput('')
    setPendingFile(null)
    setLoading(true)

    // Build API history (all previous messages + new user message)
    const apiMessages = [...messages, newUserMsg].map((m) => ({
      role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          language,
          file: fileToSend ?? undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let botText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        botText += decoder.decode(value, { stream: true })
        setMessages((prev) => [...prev.slice(0, -1), { from: 'bot', text: botText }])
      }

      if (!botText) throw new Error('Empty response')
    } catch {
      setMessages((prev) => [...prev.slice(0, -1), { from: 'bot', text: ERROR_MSG[language] }])
    } finally {
      setLoading(false)
    }
  }

  const canSend = (input.trim() !== '' || pendingFile !== null) && !loading

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      {open && (
        <div
          className="w-[22rem] rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col"
          style={{ height: '30rem' }}
        >
          {/* Header */}
          <div className="bg-gray-900 text-white px-4 py-3 shrink-0">
            <div className="flex items-center justify-between">
              {/* Brand */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-none">Print Expert</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">AI Print Advisor</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Language switcher */}
                <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
                  {(['en', 'de', 'fr'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => switchLanguage(lang)}
                      className={[
                        'px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors',
                        language === lang
                          ? 'bg-red-600 text-white'
                          : 'text-gray-400 hover:text-white',
                      ].join(' ')}
                    >
                      {LANG_LABELS[lang]}
                    </button>
                  ))}
                </div>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors ml-1"
                  aria-label="Close chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* Bot avatar dot */}
                {msg.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-1 mr-2">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                <div
                  className={[
                    'max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed',
                    msg.from === 'user'
                      ? 'bg-gray-900 text-white rounded-br-sm'
                      : 'bg-white text-gray-700 border border-gray-200 rounded-bl-sm shadow-sm',
                  ].join(' ')}
                >
                  {/* File badge */}
                  {msg.file && msg.from === 'user' && (
                    <div className="mb-1.5 text-xs opacity-60 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="truncate max-w-[140px]">{msg.file.name}</span>
                      <span className="shrink-0">({Math.round(msg.file.size / 1024)}KB)</span>
                    </div>
                  )}
                  {/* Typing dots OR message text */}
                  {msg.text === '' && loading && i === messages.length - 1 ? (
                    <TypingDots />
                  ) : (
                    <MessageText text={msg.text} />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Pending file pill */}
          {pendingFile && (
            <div className="px-3 py-1.5 bg-blue-50 border-t border-blue-100 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 text-xs text-blue-700 min-w-0">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="truncate">{pendingFile.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                className="ml-2 text-blue-400 hover:text-blue-600 shrink-0 text-base leading-none"
                aria-label="Remove file"
              >
                ×
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="px-3 py-2.5 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0">
            {/* File attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingFile}
              title="Attach file (PDF, PNG, JPG, SVG, AI, PSD)"
              className={[
                'w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center transition-colors shrink-0',
                uploadingFile
                  ? 'border-blue-400 text-blue-500 animate-pulse'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40',
              ].join(' ')}
              aria-label="Attach file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.svg,.ai,.psd"
              className="hidden"
              onChange={handleFileSelect}
            />

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSend && send()}
              placeholder={PLACEHOLDER[language]}
              disabled={loading}
              className="flex-1 text-sm rounded-lg border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white disabled:opacity-50"
            />

            {/* Send */}
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Toggle button ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center transition-colors relative"
        aria-label={open ? 'Close chat' : 'Open Print Expert chat'}
      >
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
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
