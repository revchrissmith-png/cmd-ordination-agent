// Iteration: v2.1 - Direct Auth Dashboard
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
      // 1. Get the Auth User
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        setLoading(false)
        return
      }

      setUser(authUser)

      // 2. Get the Profile Role
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setProfile(prof)
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) return <div className="p-20 text-center animate-pulse">Finalizing Connection...</div>

  if (!user) return (
    <div className="p-20 text-center">
      <h1 className="text-xl font-bold text-red-600">No Session Found</h1>
      <p className="text-gray-500 mb-4">Please log in to continue.</p>
      <Link href="/" className="text-blue-600 underline font-bold">Return to Login</Link>
    </div>
  )

  const isAdmin = profile?.role === 'admin'

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">CMD Portal</h1>
            <p className="text-gray-500 italic">User: {user.email}</p>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mt-1">
              Role: {profile?.role || 'Guest'}
            </p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            className="text-sm bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
          >
            Sign Out
          </button>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {isAdmin ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100">
              <h2 className="text-xl font-bold text-blue-900 mb-2">Admin Console</h2>
              <Link href="/dashboard/admin" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-bold mt-4">
                Open Admin List
              </Link>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ordinand Checklist</h2>
              <Link href="/dashboard/requirements" className="inline-block bg-gray-800 text-white px-6 py-2 rounded-lg font-bold mt-4">
                View Requirements
              </Link>
            </div>
          )}

          <div className="bg-purple-50 p-8 rounded-2xl shadow-sm border border-purple-100">
            <h2 className="text-xl font-bold text-purple-900 mb-2">Study Agent</h2>
            <Link href="/agent" className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-bold mt-4">
              Open Agent
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
