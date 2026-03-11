// Iteration: v2.0 - Patient Auth Version
'use client'
import { useEffect, useState } from 'react'
import { useProfile } from '../../hooks/use-profile'
import Link from 'next/link'
import { supabase } from '../../utils/supabase/client'

export default function DashboardHome() {
  const { profile, loading, isAdmin } = useProfile()
  const [showContent, setShowContent] = useState(false)

  // Give the session 1 second to "settle" before showing the Expired message
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowContent(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading || !showContent) return (
    <div className="p-20 text-center animate-pulse text-blue-900 font-medium">
      Finalizing Session...
    </div>
  )

  if (!profile) return (
    <div className="p-20 text-center">
      <h1 className="text-xl font-bold text-red-600">Session Expired</h1>
      <p className="text-gray-500 text-sm mt-2">We couldn't verify your login. Please try again.</p>
      <Link href="/" className="text-blue-600 underline mt-6 block font-bold">Return to Login</Link>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">CMD Portal</h1>
            <p className="text-gray-500 italic">Logged in as: {profile.email}</p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            className="text-sm bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
          >
            Sign Out
          </button>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {isAdmin ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h2 className="text-xl font-bold text-blue-900 mb-2">Admin Console</h2>
              <p className="text-gray-600 mb-6 text-sm">Review ordinand progress and manage candidates.</p>
              <Link href="/dashboard/admin" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                Open Admin List
              </Link>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ordinand Checklist</h2>
              <p className="text-gray-600 mb-6 text-sm">Track your progress toward accreditation.</p>
              <Link href="/dashboard/requirements" className="inline-block bg-gray-800 text-white px-6 py-2 rounded-lg font-bold">
                View Requirements
              </Link>
            </div>
          )}

          <div className="bg-purple-50 p-8 rounded-2xl shadow-sm border border-purple-100">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl">🤖</div>
            <h2 className="text-xl font-bold text-purple-900 mb-2">Study Agent</h2>
            <p className="text-gray-600 mb-6 text-sm">Access your original study tool and AI assistant.</p>
            <Link href="/agent" className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors">
              Open Agent
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
