// Iteration: v1.1
// Location: GitHub -> app/dashboard/page.tsx
'use client'
import { useProfile } from '@/hooks/use-profile'
import Link from 'next/link'

export default function Dashboard() {
  const { profile, loading, isAdmin, isOrdinand } = useProfile()

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">CMD Portal</h1>
      <p className="mb-8">Welcome, {profile?.email}</p>

      <div className="grid gap-6">
        {isOrdinand && (
          <div className="p-6 border rounded-lg bg-blue-50">
            <h2 className="text-xl font-bold text-blue-900">Ordinand Checklist</h2>
            <p className="mb-4">View your requirements and track your progress.</p>
            <Link href="/dashboard/requirements" className="bg-blue-600 text-white px-4 py-2 rounded inline-block">
              View Checklist
            </Link>
          </div>
        )}

        {isAdmin && (
          <div className="p-6 border rounded-lg bg-purple-50">
            <h2 className="text-xl font-bold text-purple-900">District Admin Console</h2>
            <p className="mb-4">Manage ordinands, assign tasks, and verify completions.</p>
            <Link href="/dashboard/admin" className="bg-purple-600 text-white px-4 py-2 rounded inline-block">
              Manage Candidates
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
