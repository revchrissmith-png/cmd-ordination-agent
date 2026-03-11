// Iteration: v1.3
// Location: GitHub -> app/dashboard/page.tsx
'use client'
import { useProfile } from '../../hooks/use-profile'
import Link from 'next/link'

export default function Dashboard() {
  const { profile, loading, isAdmin, isOrdinand } = useProfile()

  // SAFETY CHECK: If the environment variables are missing, show a clear error instead of a blank page
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="p-10 text-red-600 bg-red-50 border border-red-200 m-8 rounded">
        <h2 className="font-bold">Configuration Error</h2>
        <p>Supabase URL is missing. Please check Vercel Environment Variables.</p>
      </div>
    )
  }

  if (loading) return (
    <div className="p-10 text-center animate-pulse">
      <span className="text-gray-400">Verifying credentials...</span>
    </div>
  )

  // If loading is done but there is no profile, they aren't logged in
  if (!profile) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">Session Expired</h2>
        <p className="mb-4">Please log in again to access the portal.</p>
        <Link href="/" className="text-blue-600 underline">Return to Login</Link>
      </div>
    )
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">CMD Portal</h1>
        <p className="text-gray-500">Logged in as: <span className="font-medium text-gray-900">{profile.email}</span></p>
      </header>

      <div className="grid gap-6">
        {isOrdinand && (
          <div className="p-6 border rounded-xl bg-blue-50 border-blue-100 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900">Ordinand Checklist</h2>
            <p className="text-blue-700 mb-4 opacity-80">Track your progress toward accreditation.</p>
            <Link href="/dashboard/requirements" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold inline-block transition-colors">
              View My Requirements
            </Link>
          </div>
        )}

        {isAdmin && (
          <div className="p-6 border rounded-xl bg-purple-50 border-purple-100 shadow-sm">
            <h2 className="text-xl font-bold text-purple-900">District Admin Console</h2>
            <p className="text-purple-700 mb-4 opacity-80">Manage candidates and verify requirements.</p>
            <Link href="/dashboard/admin" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold inline-block transition-colors">
              Manage Ordinands
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
