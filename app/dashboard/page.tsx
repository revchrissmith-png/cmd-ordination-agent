// Iteration: v2.5 - Final Admin Button Fix
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
      if (!authUser) { 
        setLoading(false)
        return 
      }
      setUser(authUser)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (prof) {
        setProfile(prof)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  // Explicitly check for the admin role
  const isAdmin = profile?.role === 'admin'

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">CMD Portal</h1>
              {isAdmin && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium mt-2">
              Welcome back, {profile?.first_name || user?.email}
            </p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all w-fit"
          >
            Sign Out
          </button>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Admin Card - Now with more aggressive rendering logic */}
          {isAdmin ? (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-200 flex flex-col h-full ring-4 ring-blue-50">
              <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl">📋</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Console</h2>
              <p className="text-slate-500 mb-8 flex-grow">Manage candidates, track progress, and review submitted documents for the District.</p>
              <Link href="/dashboard/admin" className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                Open Manager
              </Link>
            </div>
          ) : null}

          {/* Ordinand Card */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
            <div className="bg-slate-50 text-slate-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl">✔️</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Requirements</h2>
            <p className="text-slate-500 mb-8 flex-grow">View your personalized checklist for ordination and accreditation status.</p>
            <Link href="/dashboard/requirements" className="bg-slate-900 text-white text-center py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200">
              View Checklist
            </Link>
          </div>

          {/* Agent Card */}
          <div className="bg-purple-50 p-8 rounded-3xl shadow-sm border border-purple-100 flex flex-col h-full">
            <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl">🤖</div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">Study Agent</h2>
            <p className="text-slate-600 mb-8 flex-grow">Access the AI study assistant to help prepare for exams and doctrinal reviews.</p>
            <Link href="/agent" className="bg-purple-600 text-white text-center py-3 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100">
              Launch Agent
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
