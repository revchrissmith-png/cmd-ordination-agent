// Iteration: v2.2 - Root Page with Auth State Listener
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // 1. Check initial session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
      setLoading(false)
    }

    checkUser()

    // 2. Listen for the Magic Link "Sign In" event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('Sending...')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) setMessage(error.message)
    else setMessage('Success! Check your email for the link.')
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-white">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-blue-900 mb-4 tracking-tight">CMD Ordination</h1>
        <p className="text-gray-500 mb-8 text-lg">Sign in to access your portal.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-blue-900"
            required
          />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
            Send Magic Link
          </button>
        </form>
        {message && <p className="mt-4 text-blue-600 font-medium">{message}</p>}
      </div>
    </main>
  )
}
