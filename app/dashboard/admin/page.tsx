// Iteration: v1.0
// Location: GitHub -> app/dashboard/admin/page.tsx
// Purpose: District Admin interface to view and manage all ordinands.

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useProfile } from '@/hooks/use-profile'

export default function AdminPage() {
  const { isAdmin, loading: profileLoading } = useProfile()
  const [ordinands, setOrdinands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrdinands() {
      if (!isAdmin) return
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'ordinand')

      if (!error) setOrdinands(data)
      setLoading(false)
    }

    if (!profileLoading && isAdmin) fetchOrdinands()
  }, [isAdmin, profileLoading])

  if (profileLoading || loading) return <p className="p-8 text-center text-gray-500">Loading Admin Console...</p>

  if (!isAdmin) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
        <p>You do not have administrative privileges for the Canadian Midwest District.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">District Administration</h1>
        <p className="text-gray-600 mt-2">Manage all active ordinands and track their accreditation progress.</p>
      </header>

      <div className="bg-white shadow-sm border rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ordinand</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ordinands.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">No active ordinands found.</td>
              </tr>
            ) : (
              ordinands.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">ACTIVE</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 font-bold">Manage Requirements</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
