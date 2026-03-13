// app/dashboard/study/page.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTED_QUESTIONS = [
  'What does the Alliance mean by the Fourfold Gospel?',
  'How does Scripture support the doctrine of divine healing?',
  'What is the role of the Holy Spirit in sanctification?',
  'How does the Great Commission shape Alliance mission theology?',
  'What does it mean for ministry to be Christ-centred?',
  'How do I think about the relationship between faith and healing?',
]

export default function StudyAgentPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return
    const userMessage: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/study-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: accumulated }
          return copy
        })
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: 'Something went wrong. Please try again.' }
        return copy
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">

      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors">← Dashboard</Link>
            <h1 className="text-xl font-black text-slate-900 mt-0.5">Theological Study Assistant</h1>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">Powered by Claude</span>
        </div>
      </div>

      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <p className="max-w-3xl mx-auto text-xs font-bold text-amber-700 text-center">
          This assistant is here to help you <span className="underline">think and study</span> — it will not write your papers, sermons, or assignments for you.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">✝</div>
              <p className="text-lg font-black text-slate-700 mb-1">What would you like to explore?</p>
              <p className="text-sm text-slate-400 font-medium mb-8">Ask about Alliance theology, the Fourfold Gospel, Scripture, or your ordination topics.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:shadow-sm transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black shrink-0 mt-1 mr-3">✝</div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm leading-relaxed font-medium whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              }`}>
                {msg.content || (isLoading && i === messages.length - 1
                  ? <span className="flex gap-1 items-center h-5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  : null
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a theological question... (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 text-sm max-h-40 overflow-y-auto disabled:opacity-60"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none shrink-0"
          >
            Send
          </button>
        </div>
        <p className="max-w-3xl mx-auto text-xs text-slate-300 font-medium mt-2 px-1">Enter to send · Shift+Enter for new line</p>
      </div>

    </main>
  )
}

