// app/progress-checkin/[token]/page.tsx
// Public, no-login mentor progress check-in form. Talks only to the
// service-role API at /api/progress-checkin/[token].
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PROGRESS_QUESTIONS } from '../../../lib/mentor-progress'

type Meta = {
  round: number
  status: string
  alreadySubmitted: boolean
  ordinandFirstName: string | null
  ordinandName: string | null
}

const DEEP_SEA = '#00426A'

export default function ProgressCheckinPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ''

  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [wantsMeeting, setWantsMeeting] = useState<boolean | null>(null)
  const [comments, setComments] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch(`/api/progress-checkin/${token}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((m: Meta) => { setMeta(m); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  const name = meta?.ordinandFirstName || meta?.ordinandName || 'your ordinand'
  const canSubmit = PROGRESS_QUESTIONS.some(q => (answers[q.key] ?? '').trim().length > 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('submitting'); setErrorMsg('')
    const res = await fetch(`/api/progress-checkin/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...answers, requested_meeting: wantsMeeting, additional_comments: comments }),
    }).catch(() => null)
    if (res && res.ok) { setStatus('done'); return }
    const data = res ? await res.json().catch(() => ({})) : {}
    setStatus('error')
    setErrorMsg(data?.error === 'already_submitted' ? 'This check-in has already been submitted. Thank you.' : 'Something went wrong. Please try again.')
  }

  const wrap: React.CSSProperties = { fontFamily: 'Arial, sans-serif', maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.25rem' }

  if (loading) return <div style={wrap}><p style={{ color: '#94a3b8' }}>Loading…</p></div>
  if (notFound) return <div style={wrap}><h1 style={{ color: DEEP_SEA }}>Link not found</h1><p style={{ color: '#475569' }}>This check-in link is invalid or has expired. Please contact the District Ministry Centre.</p></div>

  if (status === 'done' || meta?.alreadySubmitted) {
    return (
      <div style={wrap}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
        <h1 style={{ color: DEEP_SEA, fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Thank you</h1>
        <p style={{ color: '#475569', lineHeight: 1.7 }}>Your check-in has been submitted to the Canadian Midwest District. We're grateful for the time you give to {name}.</p>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Canadian Midwest District · Mentor Check-in {meta ? `${meta.round} of 2` : ''}</p>
      <h1 style={{ color: DEEP_SEA, fontSize: '1.7rem', margin: '0.4rem 0 0.5rem' }}>How is {name} doing?</h1>
      <p style={{ color: '#475569', lineHeight: 1.7, margin: '0 0 1.75rem' }}>A short, narrative check-in to help us support {name} well. Answer at least one question — there's no need to write a lot. The portal already tracks their assignment progress; what we value from you is the human picture behind it.</p>

      <form onSubmit={submit}>
        {PROGRESS_QUESTIONS.map(q => (
          <div key={q.key} style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', fontSize: '0.95rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>{q.label(name)}</label>
            <textarea
              value={answers[q.key] ?? ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
              rows={4}
              placeholder="Your response…"
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
        ))}

        <div style={{ margin: '1.75rem 0', padding: '1.1rem 1.25rem', background: '#F8FAFC', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <p style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem', margin: '0 0 0.65rem' }}>Would you like to arrange a conversation with Chris Smith (District) about {name}?</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
              <button type="button" key={label} onClick={() => setWantsMeeting(val)}
                style={{ flex: 1, padding: '0.6rem', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  border: `1.5px solid ${wantsMeeting === val ? DEEP_SEA : '#cbd5e1'}`,
                  background: wantsMeeting === val ? DEEP_SEA : '#fff', color: wantsMeeting === val ? '#fff' : '#475569' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#334155', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Anything else? <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
          <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="Optional comments…"
            style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
        </div>

        {status === 'error' && <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>{errorMsg}</p>}

        <button type="submit" disabled={!canSubmit || status === 'submitting'}
          style={{ background: canSubmit ? DEEP_SEA : '#94a3b8', color: '#fff', border: 'none', borderRadius: 10, padding: '0.8rem 1.5rem', fontWeight: 800, fontSize: '0.95rem', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: status === 'submitting' ? 0.7 : 1 }}>
          {status === 'submitting' ? 'Submitting…' : 'Submit check-in'}
        </button>
      </form>
    </div>
  )
}
