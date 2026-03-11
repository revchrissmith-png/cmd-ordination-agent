// Iteration: v1.2
// Location: GitHub -> app/dashboard/admin/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client'
import { useProfile } from '../../../hooks/use-profile'

export default function AdminPage() {
  const { isAdmin, loading: profileLoading, profile } = useProfile()
  const [ordinands, setOrdinands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrdinands() {
      try {
        if (!isAdmin) return
        
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'ordinand')

        if (dbError) throw dbError
        setOrdinands(data || [])
      } catch (e: any) {
        console.error(e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    if (!profileLoading) {
      if (isAdmin) {
        fetchOrdinands()
      } else {
        setLoading(false)
      }
    }
  }, [isAdmin, profileLoading])

  if (profileLoading) return <p className="p-10 text-center">Verifying Admin Permissions...</p>
  
  if (!isAdmin) return (
    <div className="p-10 text-center text-red-600">
      <h1 className="text-xl font-bold">Access Denied</h1>
      <p>Your account ({profile?.email}) is not marked as an Admin.</p>
    </div>
  )

  if (loading) return <p className="p-10 text-center">Fetching Ordinand List...</p>
  if (error) return <p className="p-10 text-center text-red-500">Error: {error}</p>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">District Admin Console</h1>
      <div className="bg-white shadow border rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ordinands.length === 0 ? (
              <tr><td className="p-10 text-center text-gray-400">No ordinands found in the database.</td></tr>
            ) : (
              ordinands.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4">{u.first_name} {u.last_name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
