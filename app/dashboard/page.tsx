// Iteration: v2.7 - Role Verification Fix
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase/client'
import Link from 'next/link'

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      // Small delay to ensure session is synced
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return; }
      setUser(authUser)

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error("Profile fetch error:", error.message);
      }
      
      if (prof) setProfile(prof)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono text-blue-600">
      Initializing Portal...
    </div>
  )

  const isAdmin = profile?.role === 'admin'

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b pb-6">
          <h1 className="text-4xl font-extrabold text-slate-900">CMD Portal</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <p className="text-slate-500">User: {user?.email}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isAdmin ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              Role: {profile?.role || 'Guest'}
            </span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="text-xs text-red-600 font-bold hover:underline">Sign Out</button>
          </div>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Admin Card */}
          <div className={`p-8 rounded-3xl shadow-sm border-2 flex flex-col h-full transition-all ${isAdmin ? 'bg-white border-blue-500 ring-8 ring-blue-50' : 'bg-gray-100 border-gray-200 grayscale opacity-50'}`}>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Console</h2>
            <p className="text-slate-500 mb-8 flex-grow">Manage candidates and track District progress.</p>
            {isAdmin ? (
              <Link href="/dashboard/admin" className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold">Open Manager</Link>
            ) : (
              <div className="text-center py-3 text-gray-400 font-bold italic">Admin Access Required</div>
            )}
          </div>

          {/* Ordinand Card */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Requirements</h2>
            <p className="text-slate-500 mb-8 flex-grow">View your personalized checklist.</p>
            <Link href="/dashboard/requirements" className="bg-slate-900 text-white text-center py-3 rounded-xl font-bold">View Checklist</Link>
          </div>

          {/* Agent Card */}
          <div className="bg-purple-50 p-8 rounded-3xl shadow-sm border border-purple-100 flex flex-col h-full text-purple-900">
            <h2 className="text-2xl font-bold mb-2">Study Agent</h2>
            <p className="text-purple-700/70 mb-8 flex-grow">Access the AI study assistant.</p>
            <Link href="/agent" className="bg-purple-600 text-white text-center py-3 rounded-xl font-bold">Launch Agent</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
