// Iteration: v2.2 - Admin Role Diagnostic
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

      // Attempt to find the profile
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (prof) setProfile(prof)
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) return <div className="p-20 text-center animate-pulse">Checking Permissions...</div>

  if (!user) return (
    <div className="p-20 text-center">
      <h1 className="text-xl font-bold text-red-600">No Session Found</h1>
      <Link href="/" className="text-blue-600 underline">Return to Login</Link>
    </div>
  )

  const isAdmin = profile?.role === 'admin'

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* DIAGNOSTIC BANNER: Only while we fix the role issue */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono">
          <p className="font-bold mb-1 uppercase">Diagnostic Data:</p>
          <p>Logged in ID: <span className="text-blue-600">{user.id}</span></p>
          <p>Profile Found: <span className={profile ? "text-green-600" : "text-red-600"}>{profile ? "YES" : "NO"}</span></p>
          <p>Role in DB: <span className="text-purple-600">"{profile?.role || 'null'}"</span></p>
        </div>

        <header className="flex justify-between items-center mb-10 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">CMD Portal</h1>
            <p className="text-gray-500 italic">User: {user.email}</p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            className="text-sm bg-white border px-4 py-2 rounded-lg"
          >
            Sign Out
          </button>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {isAdmin ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-blue-500">
              <h2 className="text-xl font-bold text-blue-900 mb-2">Admin Console</h2>
              <p className="text-sm text-gray-600 mb-6">You have full administrative access.</p>
              <Link href="/dashboard/admin" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
                Open Admin List
              </Link>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ordinand Checklist</h2>
              <p className="text-sm text-gray-600 mb-6">Standard candidate access.</p>
              <Link href="/dashboard/requirements" className="inline-block bg-gray-800 text-white px-6 py-2 rounded-lg font-bold">
                View Requirements
              </Link>
            </div>
          )}

          <div className="bg-purple-50 p-8 rounded-2xl shadow-sm border border-purple-100">
            <h2 className="text-xl font-bold text-purple-900 mb-2">Study Agent</h2>
            <Link href="/agent" className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">
              Open Agent
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
