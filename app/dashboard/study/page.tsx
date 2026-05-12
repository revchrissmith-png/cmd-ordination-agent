// app/dashboard/study/page.tsx — Pardington AI Ordination Study Partner
'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../../utils/supabase/client'
import { logActivity } from '../../../utils/logActivity'
import { C } from '../../../lib/theme'
import ModalWrapper from '../../components/ModalWrapper'

type Message = { role: 'user' | 'assistant'; content: string }

const INTERVIEW_PREP_PROMPT = 'I would like to prepare for my oral interview with the Ordaining Council. Please walk me through the interview questions one at a time, starting from the beginning.'

const SUGGESTED_QUESTIONS = [
  'What does the Alliance mean by the Fourfold Gospel?',
  'How does Scripture support the doctrine of divine healing?',
  'What is the role of the Holy Spirit in sanctification?',
  'How does the Great Commission shape Alliance mission theology?',
  'What does it mean for ministry to be Christ-centred?',
  'How do I think about the relationship between faith and healing?',
]

type SessionRow = {
  session_id: string
  messages: Message[]
  started_at: string
  last_message_at: string | null
}

export default function PardingtonPage() {
  const [messages, setMessages]           = useState<Message[]>([])
  const [input, setInput]                 = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [sessionStale, setSessionStale]   = useState(false)
  const [consentStatus, setConsentStatus] = useState<'loading' | 'needed' | 'granted'>('loading')
  const [sessions, setSessions]           = useState<SessionRow[]>([])
  // Default true so SSR / mobile first paint hide the sidebar; flips after mount on wide viewports.
  const [isNarrowViewport, setIsNarrowViewport] = useState(true)
  // Mobile slide-in history drawer (no effect on desktop, which always shows the sidebar).
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastActivity = useRef<number>(Date.now())

  // Session identity — stable for the lifetime of this page load.
  const sessionId  = useRef<string>(crypto.randomUUID())
  const startedAt  = useRef<string>(new Date().toISOString())
  const ordinandId = useRef<string | null>(null)

  // Stale session warning — after 45 minutes of inactivity, warn that session may have expired
  useEffect(() => {
    const STALE_MS = 45 * 60 * 1000
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current >= STALE_MS) setSessionStale(true)
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Track viewport width so the 360px sidebar isn't forced onto mobile.
  // Inline styles on the <aside> override CSS media queries, so the hide
  // decision has to live in JS / conditional render.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 800px)')
    setIsNarrowViewport(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsNarrowViewport(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Close the mobile drawer automatically if the user rotates or resizes into desktop.
  useEffect(() => {
    if (!isNarrowViewport) setIsHistoryOpen(false)
  }, [isNarrowViewport])

  // Plain-text history summary injected into the system prompt each turn.
  // Built once from older sessions; never changes during a session.
  const studyHistory = useRef<string>('')

  // Build the history context block from sessions older than the one being resumed.
  // Extracts user questions up to MAX_CHARS so the token cost stays bounded.
  function buildHistorySummary(sessions: Array<{ messages: Message[]; started_at: string }>): string {
    const MAX_CHARS = 2500
    const lines: string[] = []
    let charCount = 0

    for (const session of sessions) {
      if (charCount >= MAX_CHARS) break
      const userMsgs = session.messages.filter(m => m.role === 'user')
      if (userMsgs.length === 0) continue

      const date = new Date(session.started_at).toLocaleDateString('en-CA', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
      lines.push(`[${date}]`)

      for (const msg of userMsgs) {
        const excerpt = msg.content.length > 160
          ? msg.content.slice(0, 157) + '…'
          : msg.content
        lines.push(`- "${excerpt}"`)
        charCount += excerpt.length + 5
        if (charCount >= MAX_CHARS) break
      }
      lines.push('')
    }

    if (lines.length === 0) return ''

    const sessionWord = sessions.length === 1 ? 'session' : 'sessions'
    return [
      '---',
      '',
      '## Your conversation history with this ordinand',
      '',
      `You have spoken with this ordinand in ${sessions.length} previous ${sessionWord}. Here are the questions and topics they raised:`,
      '',
      ...lines,
      'Use this history to build naturally on what they have already explored. Do not re-explain things they have clearly worked through. Notice topics they return to repeatedly — these may be areas they are wrestling with or find particularly meaningful. Greet them as someone you already know, not as a stranger.',
    ].join('\n')
  }

  // Refresh the sidebar's session list from pardington_logs. Called on mount,
  // after consent, after each save, and after "+ New conversation".
  async function loadSessions() {
    if (!ordinandId.current) return
    const { data } = await supabase
      .from('pardington_logs')
      .select('session_id, messages, started_at, last_message_at')
      .eq('ordinand_id', ordinandId.current)
      .order('started_at', { ascending: false })
    if (data) setSessions(data as SessionRow[])
  }

  // Switch the chat pane to a specific historical session.
  function selectSession(session: SessionRow) {
    sessionId.current = session.session_id
    startedAt.current = session.started_at
    setMessages(session.messages ?? [])
    setSessionStale(false)
    lastActivity.current = Date.now()
    setIsHistoryOpen(false)
  }

  // Derive a short title for a session's sidebar entry from the first user message.
  function getSessionTitle(session: SessionRow): string {
    const firstUser = session.messages?.find(m => m.role === 'user')
    if (!firstUser) return 'New conversation'
    const text = firstUser.content.trim().replace(/\s+/g, ' ')
    return text.length > 60 ? text.slice(0, 57) + '…' : text
  }

  // Format a session's date for sidebar display (short, locale-aware).
  function formatSessionDate(session: SessionRow): string {
    const ts = session.last_message_at || session.started_at
    return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setIsLoadingHistory(false); setConsentStatus('granted'); return }
      ordinandId.current = user.id
      logActivity(user.id, 'pardington', '/dashboard/study')

      // Check whether the ordinand has already accepted the Pardington disclaimer.
      const { data: profile } = await supabase
        .from('profiles')
        .select('pardington_consent_at')
        .eq('id', user.id)
        .single()

      if (!profile?.pardington_consent_at) {
        setConsentStatus('needed')
        setIsLoadingHistory(false)
        return // Don't load chat history until consent is given
      }
      setConsentStatus('granted')

      // Fetch recent sessions — most recent first.
      // Index 0 = resume candidate; indices 1–5 = history for system prompt.
      const { data: logs } = await supabase
        .from('pardington_logs')
        .select('session_id, messages, started_at')
        .eq('ordinand_id', user.id)
        .order('started_at', { ascending: false })
        .limit(6)

      if (logs && logs.length > 0) {
        // Option 2 — Resume the most recent session
        const latest = logs[0] as { session_id: string; messages: Message[]; started_at: string }
        if (latest.messages && latest.messages.length > 0) {
          setMessages(latest.messages)
          sessionId.current = latest.session_id   // continue upserting the same row
          startedAt.current = latest.started_at
        }

        // Option 1 — Build topic history from older sessions for the system prompt
        if (logs.length > 1) {
          const older = logs.slice(1) as Array<{ messages: Message[]; started_at: string }>
          studyHistory.current = buildHistorySummary(older)
        }
      }

      // Populate the sidebar's full session list.
      await loadSessions()

      setIsLoadingHistory(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Record consent and load chat history
  async function acceptConsent() {
    if (!ordinandId.current) return
    await supabase
      .from('profiles')
      .update({ pardington_consent_at: new Date().toISOString() })
      .eq('id', ordinandId.current)

    setConsentStatus('granted')
    setIsLoadingHistory(true)

    // Now load chat history (same logic as above)
    const { data: logs } = await supabase
      .from('pardington_logs')
      .select('session_id, messages, started_at')
      .eq('ordinand_id', ordinandId.current)
      .order('started_at', { ascending: false })
      .limit(6)

    if (logs && logs.length > 0) {
      const latest = logs[0] as { session_id: string; messages: Message[]; started_at: string }
      if (latest.messages && latest.messages.length > 0) {
        setMessages(latest.messages)
        sessionId.current = latest.session_id
        startedAt.current = latest.started_at
      }
      if (logs.length > 1) {
        const older = logs.slice(1) as Array<{ messages: Message[]; started_at: string }>
        studyHistory.current = buildHistorySummary(older)
      }
    }

    // Populate the sidebar's full session list.
    await loadSessions()

    setIsLoadingHistory(false)
  }

  // Start a completely fresh conversation (new session row, empty chat)
  function startNewConversation() {
    sessionId.current = crypto.randomUUID()
    startedAt.current = new Date().toISOString()
    setMessages([])
    setIsHistoryOpen(false)
  }

  // Persist the completed conversation to pardington_logs.
  // Uses an upsert on session_id so each page-load accumulates into
  // one row regardless of how many exchanges happen in the session.
  // Fire-and-forget — never blocks or throws into the UI.
  async function saveSession(finalMessages: Message[]) {
    if (!ordinandId.current) return
    try {
      await supabase.from('pardington_logs').upsert(
        {
          session_id:      sessionId.current,
          ordinand_id:     ordinandId.current,
          messages:        finalMessages,
          message_count:   finalMessages.length,
          started_at:      startedAt.current,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      )
      // Refresh the sidebar so the current session shows its updated message
      // count / preview text and rises to the top of the list.
      await loadSessions()
    } catch {
      // Silently swallow — logging must never interrupt the conversation
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return
    lastActivity.current = Date.now()
    setSessionStale(false)
    const userMessage: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/study-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: updatedMessages, studyHistory: studyHistory.current }),
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

      // Stream complete — persist the full conversation (including the
      // just-finished assistant response) to pardington_logs.
      const completedMessages: Message[] = [
        ...updatedMessages,
        { role: 'assistant', content: accumulated },
      ]
      saveSession(completedMessages)
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

  // Shared inner content of the conversation-history sidebar.
  // Rendered inside <aside> on desktop and inside the slide-in drawer on mobile.
  const sidebarContents = (
    <>
      {/* Sidebar header */}
      <div style={{ padding: '1.1rem 1.5rem 0.75rem', flexShrink: 0 }}>
        <div style={{ color: '#9FB3CC', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.25em' }}>CONVERSATIONS</div>
        <div style={{ width: '52px', height: '2px', backgroundColor: '#F4B91A', borderRadius: '2px', marginTop: '0.5rem' }} />
      </div>

      {/* Session list (scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem' }}>
        {sessions.length === 0 ? (
          <p style={{ color: '#9FB3CC', fontSize: '0.78rem', fontStyle: 'italic', padding: '1rem 0.75rem', margin: 0 }}>
            No conversations yet. Ask a question below to start one.
          </p>
        ) : (
          sessions.map(s => {
            const isCurrent = s.session_id === sessionId.current
            return (
              <button
                key={s.session_id}
                onClick={() => selectSession(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  background: isCurrent ? '#11355A' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 0.75rem 0.75rem 1rem',
                  margin: '0.15rem 0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  color: isCurrent ? '#FAF6EE' : 'rgba(250,246,238,0.85)',
                  transition: 'background-color 0.15s ease',
                  fontFamily: 'inherit',
                }}
                onMouseOver={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(17,53,90,0.5)' }}
                onMouseOut={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                {isCurrent && (
                  <span style={{ position: 'absolute', left: 0, top: '0.65rem', bottom: '0.65rem', width: '3px', backgroundColor: '#F4B91A', borderRadius: '2px' }} />
                )}
                <div style={{ fontSize: '0.85rem', fontWeight: isCurrent ? 600 : 500, lineHeight: 1.35, marginBottom: '0.25rem' }}>
                  {getSessionTitle(s)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9FB3CC', fontWeight: 500 }}>
                  {formatSessionDate(s)} · {s.messages?.length ?? 0} {(s.messages?.length ?? 0) === 1 ? 'message' : 'messages'}
                  {isCurrent && <span style={{ color: '#F4B91A', marginLeft: '0.6rem', fontWeight: 600, letterSpacing: '0.1em' }}>CURRENT</span>}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* "+ New conversation" button at bottom */}
      <div style={{ padding: '0.75rem 1rem 1rem', flexShrink: 0, borderTop: '1px solid #1B3756' }}>
        <button
          onClick={startNewConversation}
          style={{
            display: 'block',
            width: '100%',
            background: 'transparent',
            border: '1px solid #3A5A7E',
            borderRadius: '8px',
            color: '#9FB3CC',
            padding: '0.7rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            fontFamily: 'inherit',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#F4B91A'; (e.currentTarget as HTMLButtonElement).style.color = '#FAF6EE' }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#3A5A7E'; (e.currentTarget as HTMLButtonElement).style.color = '#9FB3CC' }}
        >
          + New conversation
        </button>
      </div>
    </>
  )

  return (
    <div style={{ height: 'calc(100vh - 3.5rem)', display: 'flex', flexDirection: 'row', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

      {/* ══════════ Conversation history sidebar (desktop) ══════════ */}
      {consentStatus === 'granted' && !isNarrowViewport && (
        <aside className="pardington-sidebar" style={{
          width: '360px',
          flexShrink: 0,
          backgroundColor: '#0E2745',
          borderRight: '1px solid rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}>
          {sidebarContents}
        </aside>
      )}

      {/* ══════════ Conversation history drawer (mobile) ══════════ */}
      {consentStatus === 'granted' && isNarrowViewport && (
        <>
          {/* Backdrop — tap to dismiss */}
          <div
            onClick={() => setIsHistoryOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              opacity: isHistoryOpen ? 1 : 0,
              pointerEvents: isHistoryOpen ? 'auto' : 'none',
              transition: 'opacity 0.2s ease',
              zIndex: 40,
            }}
          />
          {/* Drawer panel — slides in from the left */}
          <aside
            aria-hidden={!isHistoryOpen}
            aria-label="Conversation history"
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: 'min(360px, 85vw)',
              backgroundColor: '#0E2745',
              display: 'flex',
              flexDirection: 'column',
              transform: isHistoryOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.22s ease',
              zIndex: 50,
              boxShadow: isHistoryOpen ? '4px 0 16px rgba(0,0,0,0.25)' : 'none',
            }}
          >
            {/* Close (X) row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 0.5rem 0', flexShrink: 0 }}>
              <button
                onClick={() => setIsHistoryOpen(false)}
                aria-label="Close conversation history"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9FB3CC',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '0.35rem 0.6rem',
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>
            {sidebarContents}
          </aside>
        </>
      )}

      {/* ══════════ Main column ══════════ */}
      <div style={{ flex: 1, backgroundColor: C.cloudGray, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

      {/* Pardington sub-header */}
      <div style={{ backgroundColor: C.deepSea, borderBottom: `3px solid ${C.allianceBlue}`, padding: '0.5rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          {isNarrowViewport && consentStatus === 'granted' && (
            <button
              onClick={() => setIsHistoryOpen(true)}
              aria-label="Open conversation history"
              style={{
                background: 'transparent',
                border: '1px solid rgba(144,200,240,0.4)',
                borderRadius: '6px',
                color: '#90C8F0',
                padding: '0.3rem 0.5rem',
                fontSize: '0.95rem',
                lineHeight: 1,
                cursor: 'pointer',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              ☰
            </button>
          )}
          <img src="/pardington-avatar.png" alt="Pardington" style={{ height: '30px', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.white, fontWeight: '900', fontSize: '0.85rem', letterSpacing: '0.05em', lineHeight: 1.1 }}>PARDINGTON</div>
            <div style={{ color: '#90C8F0', fontSize: '0.6rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ordination Study Partner</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={startNewConversation}
            style={{ color: '#90C8F0', fontSize: '0.78rem', fontWeight: 'bold', background: 'none', border: '1px solid rgba(144,200,240,0.4)', borderRadius: '6px', padding: '0.25rem 0.65rem', cursor: 'pointer' }}
          >
            + New conversation
          </button>
        )}
      </div>

      {/* Integrity banner */}
      <div style={{ backgroundColor: '#FFF8E1', borderBottom: '1px solid #F0D060', padding: '0.6rem 1.2rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 'bold', color: '#7A5800' }}>
          Pardington is here to help you <span style={{ textDecoration: 'underline' }}>think and study</span> — he will not write your papers, sermons, or assignments for you.
        </p>
      </div>

      {/* Stale session warning */}
      {sessionStale && (
        <div style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 'bold', color: '#991B1B' }}>
            Your session may have expired after being idle.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#991B1B', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {isLoadingHistory && (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '0.75rem' }}>
                {[0, 150, 300].map(delay => (
                  <span key={delay} style={{ width: '8px', height: '8px', backgroundColor: C.allianceBlue, borderRadius: '50%', display: 'inline-block', animation: 'bounce 1s infinite', animationDelay: `${delay}ms`, opacity: 0.5 }} />
                ))}
              </div>
              Picking up where you left off…
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <img
                src="/pardington-portrait.png"
                alt="Pardington"
                style={{ width: '180px', margin: '0 auto 1rem', display: 'block' }}
              />
              <p style={{ fontWeight: '900', color: C.deepSea, fontSize: '1.15rem', margin: '0 0 0.15rem', letterSpacing: '0.03em' }}>PARDINGTON</p>
              <p style={{ color: C.allianceBlue, fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Ordination Study Partner</p>
              <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1.8rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                Ask about Alliance theology, the Fourfold Gospel, Scripture, or your ordination topics.
              </p>

              {/* Interview prep — prominent button */}
              <button onClick={() => sendMessage(INTERVIEW_PREP_PROMPT)}
                style={{ display: 'block', width: '100%', maxWidth: '500px', margin: '0 auto 1.2rem', backgroundColor: C.deepSea, color: C.white, border: 'none', borderRadius: '10px', padding: '1rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.allianceBlue }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.deepSea }}>
                🎓 Help me prepare for my oral interview →
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'normal', opacity: 0.75, marginTop: '0.2rem' }}>Walk through the official Ordaining Council interview questions one by one</span>
              </button>

              {/* Topic questions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
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
          )} {/* end !isLoadingHistory && messages.length === 0 */}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '0.6rem' }}>
              {msg.role === 'assistant' && (
                <img
                  src="/pardington-avatar.png"
                  alt="Pardington"
                  style={{ width: '42px', height: '42px', flexShrink: 0, marginTop: '2px' }}
                />
              )}
              <div style={{
                maxWidth: '85%',
                backgroundColor: msg.role === 'user' ? C.allianceBlue : C.white,
                color: msg.role === 'user' ? C.white : '#222',
                padding: '0.85rem 1.1rem',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                fontSize: '0.9rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
                {msg.content || (isLoading && i === messages.length - 1
                  ? <span style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '18px' }}>
                      {[0, 150, 300].map(delay => (
                        <span key={delay} style={{ width: '6px', height: '6px', backgroundColor: C.allianceBlue, borderRadius: '50%', display: 'inline-block', animation: 'bounce 1s infinite', animationDelay: `${delay}ms` }} />
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
            placeholder="Ask Pardington a theological question… (Enter to send, Shift+Enter for new line)"
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

      </div> {/* ══════════ end main column ══════════ */}

      {/* Pardington consent disclaimer — shown once on first use */}
      {consentStatus === 'needed' && (
        <ModalWrapper
          onClose={() => {}} // Cannot dismiss without accepting
          ariaLabel="Pardington usage disclaimer"
          maxWidth="max-w-lg"
          closeOnBackdrop={false}
        >
          <div style={{ padding: '2rem 1.8rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
              <img src="/pardington-avatar.png" alt="Pardington" style={{ height: '40px' }} />
              <div>
                <div style={{ fontWeight: '900', color: C.deepSea, fontSize: '1.05rem', letterSpacing: '0.03em' }}>Before You Begin</div>
                <div style={{ color: C.allianceBlue, fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pardington Study Partner</div>
              </div>
            </div>

            <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: '#333' }}>
              <p style={{ margin: '0 0 0.8rem' }}>
                Pardington is part of your ordination support team — alongside your mentor, your cohort, and the Ordaining Council. He is here to help you think deeply, study well, and grow in your theological understanding as you prepare for ministry.
              </p>
              <p style={{ margin: '0 0 0.8rem' }}>
                As part of that support, Pardington will be asked to provide a summary assessment of your engagement — including your strengths, areas of growth, and development over time — to help the Council prepare for your final interview.
              </p>
              <p style={{ margin: '0 0 0.8rem', fontWeight: '600', color: C.deepSea }}>
                No one on the Council reads your specific conversation transcripts. Only a summarized overview of themes and progress will be shared.
              </p>
              <p style={{ margin: '0' }}>
                By continuing, you acknowledge and consent to this use of your conversations with Pardington.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <a
                href="/dashboard/ordinand"
                style={{ flex: 1, display: 'block', textAlign: 'center', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600', color: '#666', backgroundColor: '#f1f1f1', textDecoration: 'none', cursor: 'pointer' }}
              >
                Go Back
              </a>
              <button
                onClick={acceptConsent}
                style={{ flex: 2, padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 'bold', color: C.white, backgroundColor: C.deepSea, border: 'none', cursor: 'pointer' }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.allianceBlue }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.deepSea }}
              >
                I Understand — Continue
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
