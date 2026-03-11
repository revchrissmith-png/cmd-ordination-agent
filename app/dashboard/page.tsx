// Iteration: v2.0 - Root Landing Page with Auth
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase/client'
import Link from 'next/link'

export default function Home() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) setMessage(error.message)
    else setMessage('Check your email for the login link!')
  }

  if (user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-center">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Welcome back, Chris</h1>
        <p className="text-gray-600 mb-8">You are currently signed in.</p>
        <div className="flex gap-4">
          <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
            Enter Portal
          </Link>
          <button 
            onClick={() => { supabase.auth.signOut(); window.location.reload(); }}
            className="border border-gray-300 px-6 py-2 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-white">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-blue-900 mb-4 tracking-tight">CMD Ordination</h1>
        <p className="text-gray-500 mb-8 text-lg">Sign in to access your ordination requirements and materials.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
            Send Magic Link
          </button>
        </form>
        {message && <p className="mt-4 text-blue-600 font-medium">{message}</p>}
      </div>
    </main>
  )
}
