// Iteration: v2.3 - Deep Trace Diagnostic
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase/client'
import Link from 'next/link'

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [rawError, setRawError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !authUser) {
          setRawError(authError?.message || "No Auth User Found")
          setLoading(false)
          return
        }
        setUser(authUser)

        // Attempt to fetch profile with full error reporting
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profError) {
          setRawError(`Table Error: ${profError.code} - ${profError.message}`)
        } else {
          setProfile(prof)
        }
      } catch (err: any) {
        setRawError(`System Crash: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return <div className="p-20 text-center animate-pulse font-mono">🔍 Probing Database...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* THE TRACE BOX */}
        <div className="mb-6 p-6 bg-black text-green-400 rounded-lg shadow-2xl font-mono text-xs overflow-auto border-t-4 border-green-500">
          <p className="text-white font-bold mb-2 underline">SYSTEM TRACE LOG</p>
          <p>TIMESTAMP: {new Date().toISOString()}</p>
          <p>AUTH_ID: {user?.id || 'NULL'}</p>
          <p>EMAIL: {user?.email || 'NULL'}</p>
          <hr className="my-2 border-gray-700" />
          <p className={profile ? "text-green-400" : "text-yellow-400"}>
            PROFILE_STATUS: {profile ? "FOUND" : "NOT_FOUND"}
          </p>
          <p className="text-purple-400 text-sm font-bold">
            RAW_RESULT: {rawError ? `❌ ${rawError}` : "✅ OK"}
          </p>
          {rawError?.includes('406') && <p className="text-red-400 mt-2 font-bold">TIP: 406 means the 'profiles' table might be missing or empty.</p>}
          {rawError?.includes('PGRST116') && <p className="text-red-400 mt-2 font-bold">TIP: PGRST116 means the ID was not found in the table.</p>}
        </div>

        <header className="flex justify-between items-center mb-10 border-b pb-6">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">CMD Portal</h1>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} className="text-sm bg-white border px-4 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all">Sign Out</button>
        </header>

        {profile?.role === 'admin' ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border-l-8 border-blue-600">
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Admin Dashboard</h2>
            <p className="text-gray-600 mb-8">Welcome, District Administrator.</p>
            <div className="flex gap-4">
              <Link href="/dashboard/admin" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg">Manage Candidates</Link>
              <Link href="/agent" className="bg-purple-100 text-purple-700 px-8 py-3 rounded-xl font-bold hover:bg-purple-200">Open Study Agent</Link>
            </div>
          </div>
        ) : (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ordinand Portal</h2>
            <p className="text-gray-600 mb-8">Access your accreditation requirements below.</p>
            <Link href="/dashboard/requirements" className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black shadow-lg">View My Checklist</Link>
          </div>
        )}
      </div>
    </main>
  )
}
