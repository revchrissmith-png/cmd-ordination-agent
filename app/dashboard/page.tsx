// Iteration: v2.6 - Forced Visibility Version
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
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return; }
      setUser(authUser)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (prof) setProfile(prof)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4 border-b pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">CMD Portal</h1>
            <p className="text-slate-500 font-medium mt-2">Logged in as: {user?.email}</p>
            <p className="text-xs font-bold text-blue-600 uppercase mt-1">Role: {profile?.role || 'Checking...'}</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            Sign Out
          </button>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Admin Card - FORCED VISIBLE */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-blue-500 flex flex-col h-full ring-8 ring-blue-50">
            <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl">📋</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Console</h2>
            <p className="text-slate-500 mb-8 flex-grow">Manage candidates and track District progress.</p>
            <Link href="/dashboard/admin" className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
              Open Manager
            </Link>
          </div>

          {/* Ordinand Card */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
            <div className="bg-slate-50 text-slate-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl">✔️</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Requirements</h2>
            <p className="text-slate-500 mb-8 flex-grow">View your personalized checklist.</p>
            <Link href="/dashboard/requirements" className="bg-slate-900 text-white text-center py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg">
              View Checklist
            </Link>
          </div>

          {/* Agent Card */}
          <div className="bg-purple-50 p-8 rounded-3xl shadow-sm border border-purple-100 flex flex-col h-full">
            <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl">🤖</div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">Study Agent</h2>
            <p className="text-slate-600 mb-8 flex-grow">Access the AI study assistant.</p>
            <Link href="/agent" className="bg-purple-600 text-white text-center py-3 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg">
              Launch Agent
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
