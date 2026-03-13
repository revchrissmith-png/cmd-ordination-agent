// Iteration: v2.9 - Multi-role support (roles array)
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

      // Lookup 1: Try by ID (Standard)
      let { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Lookup 2: If ID fails, try by Email (Backup)
      if (!prof) {
        const { data: backupProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', authUser.email)
          .single()
        prof = backupProf
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

  // roles is now an array: ['admin', 'council'], ['ordinand'], etc.
  const roles: string[] = profile?.roles ?? []
  const isAdmin   = roles.includes('admin')
  const isCouncil = roles.includes('council')
  const isOrdinand = roles.includes('ordinand')

  const roleBadgeColor = isAdmin
    ? 'bg-blue-600 text-white'
    : isCouncil
      ? 'bg-purple-100 text-purple-700'
      : 'bg-slate-100 text-slate-600'

  const roleLabel = roles.length > 0 ? roles.join(', ') : 'No role assigned'

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b pb-6">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">CMD Portal</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <p className="text-slate-500 font-medium">User: {user?.email}</p>
            <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${roleBadgeColor}`}>
              {profile ? roleLabel : 'Profile Missing'}
            </span>
            <button
              onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
              className="text-xs bg-white border px-3 py-1 rounded-lg font-bold text-slate-400 hover:text-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {/* Admin Card — visible only to admins */}
          <div className={`p-8 rounded-3xl shadow-sm border-2 flex flex-col h-full transition-all duration-500 ${isAdmin ? 'bg-white border-blue-500 ring-8 ring-blue-50' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl bg-blue-50">📋</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Console</h2>
            <p className="text-slate-500 mb-8 flex-grow">Manage candidates and track District progress.</p>
            {isAdmin ? (
              <Link href="/dashboard/admin" className="bg-blue-600 text-white text-center py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                Open Manager
              </Link>
            ) : (
              <div className="text-center py-4 text-slate-400 font-bold italic bg-slate-200/50 rounded-2xl">
                Restricted Access
              </div>
            )}
          </div>

          {/* Council Grading Card — visible to council + admin */}
          {(isCouncil || isAdmin) && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-purple-100 flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl bg-purple-50">⚖️</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Grading Queue</h2>
              <p className="text-slate-500 mb-8 flex-grow">Review and grade assigned submissions.</p>
              <Link href="/dashboard/grading" className="bg-purple-600 text-white text-center py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">
                Open Queue
              </Link>
            </div>
          )}

          {/* Requirements Card — visible to ordinands + admins */}
          {(isOrdinand || isAdmin) && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl bg-slate-50">✔️</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Requirements</h2>
              <p className="text-slate-500 mb-8 flex-grow">View your personalized checklist.</p>
              <Link href="/dashboard/requirements" className="bg-slate-900 text-white text-center py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200">
                View Checklist
              </Link>
            </div>
          )}

          {/* Study Agent — visible to everyone */}
          <div className="bg-purple-50 p-8 rounded-3xl shadow-sm border border-purple-100 flex flex-col h-full text-purple-900">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-2xl bg-purple-100">🤖</div>
            <h2 className="text-2xl font-bold mb-2">Study Agent</h2>
            <p className="text-purple-700/70 mb-8 flex-grow font-medium">Access the AI study assistant.</p>
            <Link href="/dashboard/study" className="bg-purple-600 text-white text-center py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">
              Launch Agent
            </Link>
          </div>

        </div>
      </div>
    </main>
  )
}
