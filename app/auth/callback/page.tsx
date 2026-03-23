// app/auth/callback/page.tsx
// Landing page for magic link sign-in.
// Supabase redirects here after the user clicks the link in their email.
// The Supabase client detects the session from the URL hash and fires onAuthStateChange,
// which the login page listens for. This page just shows a loading message.
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../utils/supabase/client'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // The Supabase client automatically reads the session from the URL hash.
    // We just need to wait for it to establish the session, then redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace('/dashboard')
      }
    })

    // Fallback: if a session already exists (page refreshed), redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.deepSea,
      fontFamily: 'Arial, sans-serif',
    }}>
      <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '72px', marginBottom: '1.5rem' }} />
      <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '0.03em' }}>
        Signing you in…
      </p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
        You'll be redirected to your dashboard in a moment.
      </p>
    </div>
  )
}
