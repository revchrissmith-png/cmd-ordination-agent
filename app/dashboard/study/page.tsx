// app/dashboard/study/page.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = { role: 'user' | 'assistant'; content: string }

const C = {
  allianceBlue: '#0077C8',
  deepSea: '#00426A',
  cloudGray: '#EAEAEE',
  white: '#ffffff',
}

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
    } catch {
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
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD STUDY AGENT</span>
        </div>
        <Link href="/dashboard" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </header>

      {/* Integrity banner */}
      <div style={{ backgroundColor: '#FFF8E1', borderBottom: '1px solid #F0D060', padding: '0.6rem 1.2rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 'bold', color: '#7A5800' }}>
          This assistant is here to help you <span style={{ textDecoration: 'underline' }}>think and study</span> — it will not write your papers, sermons, or assignments for you.
        </p>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>✝</div>
              <p style={{ fontWeight: 'bold', color: C.deepSea, fontSize: '1.1rem', margin: '0 0 0.3rem' }}>What would you like to explore?</p>
              <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>Ask about Alliance theology, the Fourfold Gospel, Scripture, or your ordination topics.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem', textAlign: 'left' }}>
                {SUGGESTED_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    style={{ backgroundColor: C.white, border: `1px solid #ccc`, borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#333', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}
                    onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.allianceBlue; (e.currentTarget as HTMLButtonElement).style.color = C.allianceBlue }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ccc'; (e.currentTarget as HTMLButtonElement).style.color = '#333' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '0.6rem' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: C.allianceBlue, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>✝</div>
              )}
              <div style={{
                maxWidth: '85%',
                backgroundColor: msg.role === 'user' ? C.allianceBlue : C.cloudGray,
                color: msg.role === 'user' ? C.white : '#222',
                padding: '0.85rem 1.1rem',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                fontSize: '0.9rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content || (isLoading && i === messages.length - 1
                  ? <span style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '18px' }}>
                      {[0, 150, 300].map(delay => (
                        <span key={delay} style={{ width: '6px', height: '6px', backgroundColor: C.deepSea, borderRadius: '50%', display: 'inline-block', animation: 'bounce 1s infinite', animationDelay: `${delay}ms` }} />
                      ))}
                    </span>
                  : null
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{ backgroundColor: C.white, borderTop: `1px solid #ccc`, padding: '1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a theological question... (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
            style={{ flex: 1, padding: '0.75rem', border: `1px solid ${C.allianceBlue}`, borderRadius: '4px', fontSize: '16px', resize: 'none', maxHeight: '140px', overflowY: 'auto', outline: 'none', fontFamily: 'Arial, sans-serif', opacity: isLoading ? 0.6 : 1 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            style={{ backgroundColor: isLoading || !input.trim() ? '#aaa' : C.deepSea, color: C.white, padding: '0.75rem 1.4rem', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: '0.9rem', flexShrink: 0 }}
          >
            SEND
          </button>
        </div>
        <p style={{ maxWidth: '800px', margin: '0.4rem auto 0', fontSize: '0.72rem', color: '#999', paddingLeft: '2px' }}>Enter to send · Shift+Enter for new line</p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
