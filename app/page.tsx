// app/page.tsx — Login screen v4.1 — OTP code flow with corrected verify type
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { C } from '../lib/theme'

export default function Home() {
  const [email, setEmail]   = useState('')
  const [token, setToken]   = useState('')
  const [step, setStep]     = useState<'request' | 'verify'>('request')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // If the user is already signed in (e.g. they clicked a session link),
  // send them to the dashboard immediately.
  //
  // Also handles the implicit-flow URL hash that admin-generated magic links
  // produce (#access_token=...&refresh_token=...). The cookie-based browser
  // client uses PKCE flow by default and does not auto-process implicit-flow
  // hashes, so we do it explicitly here. Real ordinand sign-in (6-digit OTP
  // codes via verifyOtp) is unaffected.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push('/dashboard')
    })

    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.slice(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
          if (error) {
            setMessage(`Sign-in error: ${error.message}`)
            return
          }
          window.history.replaceState({}, '', window.location.pathname)
          if (data?.session) {
            // Route directly rather than relying on onAuthStateChange — the
            // listener can race with the cookie write and miss the event.
            router.push('/dashboard')
          }
        })
      }
    }

    return () => subscription.unsubscribe()
  }, [router])

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Block self-registration; only existing accounts work
      },
    })
    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setStep('verify')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('Verifying…')
    // type: 'email' is correct for email OTP codes (not 'magiclink')
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    } else if (data.session) {
      setMessage('Signed in. Redirecting…')
      router.push('/dashboard')
    } else {
      setMessage('Could not confirm your session. Please try again.')
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
            src="/cmd-logo.png"
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
              Enter your email address to receive a sign-in code.
            </p>
            <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                {loading ? 'Sending…' : 'Send Sign-In Code'}
              </button>
            </form>

            {/* Contact note */}
            <p style={{ color: '#aaa', fontSize: '0.88rem', textAlign: 'center', marginTop: '1.6rem', lineHeight: 1.6, fontWeight: '500' }}>
              Don't have access yet?<br />
              <span style={{ color: C.allianceBlue }}>Contact the CMD District Office</span> to be added to the portal.
            </p>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem' }}>📬</div>
              <p style={{ color: C.deepSea, fontWeight: '800', fontSize: '1.2rem', margin: '0 0 0.4rem 0' }}>
                Check your email
              </p>
              <p style={{ color: '#888', fontSize: '1rem', margin: 0, lineHeight: 1.6 }}>
                We sent a 6-digit code to<br />
                <strong style={{ color: C.deepSea }}>{email}</strong>
              </p>
            </div>
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                autoFocus
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '1.1rem',
                  border: '2px solid #e2e2e2',
                  borderRadius: '14px',
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  textAlign: 'center',
                  letterSpacing: '0.5em',
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
                  backgroundColor: loading ? '#aaa' : C.deepSea,
                  color: C.white,
                  padding: '1.15rem',
                  borderRadius: '14px',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {loading ? 'Verifying…' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('request'); setToken(''); setMessage('') }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: '500',
                  padding: '0.3rem 0',
                }}
              >
                Use a different email
              </button>
            </form>
          </>
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
