// app/components/BetaBanner.tsx
// Persistent beta banner shown at the top of every portal page.
// Includes a feedback button that opens a bug-report / feature-request modal.
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase/client'

export default function BetaBanner() {
  const [open, setOpen]               = useState(false)
  const [type, setType]               = useState<'bug' | 'feature'>('bug')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus]           = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [token, setToken]             = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null)
    })
  }, [])

  function close() {
    setOpen(false)
    setStatus('idle')
    setTitle('')
    setDescription('')
    setType('bug')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setStatus('submitting')

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type,
        title,
        description,
        pageUrl: typeof window !== 'undefined' ? window.location.href : null,
      }),
    })

    if (res.ok) {
      setStatus('success')
      setTimeout(close, 2200)
    } else {
      setStatus('error')
    }
  }

  return (
    <>
      {/* ── BETA BANNER ── */}
      <div style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #F59E0B', padding: '0.45rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <span style={{ fontSize: '0.95rem' }}>⚗️</span>
          <span style={{ color: '#92400E', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.02em' }}>
            Beta Build · v1.1 · Testing in progress
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{ background: 'none', border: '1px solid #B45309', borderRadius: '4px', color: '#92400E', fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.65rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          🐛 Report a Bug / Request a Feature
        </button>
      </div>

      {/* ── FEEDBACK MODAL ── */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.75rem 2rem', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#00426A' }}>Share Feedback</h2>
              <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.15rem', color: '#9CA3AF', lineHeight: 1, padding: '0.1rem 0.25rem' }}>✕</button>
            </div>

            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2.25rem', marginBottom: '0.6rem' }}>✅</div>
                <p style={{ fontWeight: 700, color: '#059669', margin: 0 }}>Thank you! Your feedback has been recorded.</p>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '0.4rem' }}>The District Office will review it shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>

                {/* Type toggle */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>What kind of feedback is this?</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {(['bug', 'feature'] as const).map(t => (
                      <label
                        key={t}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: type === t ? 700 : 400, color: type === t ? '#92400E' : '#6B7280', border: `1px solid ${type === t ? '#B45309' : '#E5E7EB'}`, borderRadius: '6px', padding: '0.35rem 0.75rem', backgroundColor: type === t ? '#FFFBEB' : 'transparent', transition: 'all 0.1s' }}
                      >
                        <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} style={{ accentColor: '#B45309', margin: 0 }} />
                        {t === 'bug' ? '🐛 Bug Report' : '✨ Feature Request'}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    Subject <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={type === 'bug' ? 'e.g. File upload button not responding' : 'e.g. Allow PDF preview before submitting'}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                    {type === 'bug' ? 'What happened? Steps to reproduce:' : 'Describe your idea:'}{' '}
                    <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder={
                      type === 'bug'
                        ? '1. I clicked on...\n2. I expected...\n3. Instead, what happened was...'
                        : 'What problem would this solve? How should it work?'
                    }
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {status === 'error' && (
                  <p style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '0.75rem', marginTop: '-0.5rem' }}>
                    Something went wrong. Please try again.
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={close}
                    style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', color: '#374151' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    style={{ padding: '0.5rem 1.25rem', backgroundColor: '#00426A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: status === 'submitting' ? 'not-allowed' : 'pointer', opacity: status === 'submitting' ? 0.7 : 1 }}
                  >
                    {status === 'submitting' ? 'Sending…' : 'Submit'}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
