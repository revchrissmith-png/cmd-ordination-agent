// app/page.tsx — Login screen v4.0 — Magic link flow, no self-registration
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

export default function Home() {
  const [email, setEmail]   = useState('')
  const [step, setStep]     = useState<'request' | 'sent'>('request')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Listen for the magic link click — Supabase sets a session automatically
  // when the user arrives back at this page via the link in their email.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,   // Prevents self-registration; only existing accounts work
      },
    })
    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    } else {
      setStep('sent')
      setMessage('')
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: C.deepSea,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: 'Arial, sans-serif',
    }}>

      {/* Card */}
      <div style={{
        backgroundColor: C.white,
        borderRadius: '28px',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>

        {/* Logo + branding */}
        <div style={{ textAlign: 'center', marginBottom: '2.4rem' }}>
          <img
            src="https://i.imgur.com/ZHqDQJC.png"
            alt="CMD Logo"
            style={{ height: '96px', marginBottom: '1.4rem' }}
          />
          <h1 style={{
            color: C.deepSea,
            fontWeight: '900',
            fontSize: '2rem',
            margin: '0 0 0.4rem 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            CMD Ordination Portal
          </h1>
          <p style={{ color: '#888', fontSize: '1rem', margin: 0, fontWeight: '500' }}>
            Canadian Midwest District · The Alliance Canada
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#eee', marginBottom: '2rem' }} />

        {step === 'request' ? (
          <>
            <p style={{ color: '#555', fontSize: '1.05rem', marginBottom: '1.5rem', fontWeight: '500', textAlign: 'center', lineHeight: 1.6 }}>
              Enter your email address and we'll send you a sign-in link.
            </p>
            <form onSubmit={handleRequestLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '1.1rem 1.2rem',
                  border: '2px solid #e2e2e2',
                  borderRadius: '14px',
                  fontSize: '1.15rem',
                  fontWeight: '500',
                  color: C.deepSea,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = C.allianceBlue)}
                onBlur={e => (e.target.style.borderColor = '#e2e2e2')}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#aaa' : C.allianceBlue,
                  color: C.white,
                  padding: '1.15rem',
                  borderRadius: '14px',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'background-color 0.2s',
                }}
              >
                {loading ? 'Sending…' : 'Send Sign-In Link'}
              </button>
            </form>

            {/* Contact note */}
            <p style={{ color: '#aaa', fontSize: '0.88rem', textAlign: 'center', marginTop: '1.6rem', lineHeight: 1.6, fontWeight: '500' }}>
              Don't have access yet?<br />
              <span style={{ color: C.allianceBlue }}>Contact the CMD District Office</span> to be added to the portal.
            </p>
          </>
        ) : (
          /* Step 2 — Magic link sent confirmation */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>📬</div>
            <p style={{ color: C.deepSea, fontWeight: '900', fontSize: '1.3rem', margin: '0 0 0.6rem 0' }}>
              Check your inbox
            </p>
            <p style={{ color: '#666', fontSize: '1rem', margin: '0 0 1.4rem', lineHeight: 1.7, fontWeight: '500' }}>
              We sent a sign-in link to<br />
              <strong style={{ color: C.deepSea }}>{email}</strong>
            </p>
            <p style={{ color: '#888', fontSize: '0.95rem', margin: '0 0 1.8rem', lineHeight: 1.6 }}>
              Click the link in that email and you'll be signed in automatically — no code needed.
            </p>
            <button
              type="button"
              onClick={() => { setStep('request'); setMessage('') }}
              style={{
                background: 'none',
                border: 'none',
                color: '#bbb',
                fontSize: '0.93rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontWeight: '500',
                padding: '0.3rem 0',
              }}
            >
              Use a different email
            </button>
          </div>
        )}

        {message && (
          <div style={{
            marginTop: '1.4rem',
            padding: '0.9rem 1.2rem',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '0.95rem',
            fontWeight: '600',
            backgroundColor: message.includes('Error') ? '#fff0f0' : '#f0f7ff',
            color: message.includes('Error') ? '#c0392b' : C.allianceBlue,
            border: `1px solid ${message.includes('Error') ? '#ffc8c8' : '#c0dcf8'}`,
          }}>
            {message}
          </div>
        )}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '2rem', textAlign: 'center' }}>
        © The Alliance Canada · Canadian Midwest District
      </p>

    </main>
  )
}
