// Iteration: v2.5 - Final OTP Code Login
'use client'
import { useState } from 'react'
import { supabase } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setStep('verify')
      setMessage('A 6-digit code has been sent to your email.')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink'
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else if (data.session) {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <h1 className="text-4xl font-bold text-blue-900 mb-6 text-center tracking-tight">CMD Portal</h1>
        
        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none text-blue-900 focus:ring-2 focus:ring-blue-500"
              required
            />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-all">
              {loading ? 'Sending...' : 'Get Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input
              type="text"
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center text-2xl tracking-widest font-bold outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
              required
            />
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-md transition-all">
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-slate-400 hover:underline">
              Change email
            </button>
          </form>
        )}
        
        {message && (
          <div className={`mt-6 p-3 rounded text-sm text-center font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            {message}
          </div>
        )}
      </div>
    </main>
  )
}
