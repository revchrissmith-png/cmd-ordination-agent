// Iteration: v1.3
// Location: GitHub -> app/dashboard/admin/page.tsx
// Purpose: District Admin interface with better state handling.

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client'
import { useProfile } from '../../../hooks/use-profile'

export default function AdminPage() {
  const { isAdmin, loading: profileLoading, profile } = useProfile()
  const [ordinands, setOrdinands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrdinands() {
      if (!isAdmin) return
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'ordinand')

      if (!error) setOrdinands(data || [])
      setLoading(false)
    }

    if (!profileLoading) {
      if (isAdmin) {
        fetchOrdinands()
      } else {
        setLoading(false)
      }
    }
  }, [isAdmin, profileLoading])

  if (profileLoading) return <p className="p-12 text-center text-gray-500">Checking credentials...</p>

  if (!isAdmin) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2">Your account ({profile?.email}) does not have Admin privileges.</p>
        <p className="text-sm text-gray-500 mt-4">Please update your role in the Supabase Dashboard.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">District Administration</h1>
          <p className="text-gray-600">Managing active ordinands for the Canadian Midwest District.</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          Admin: {profile?.email}
        </div>
      </div>

      <div className="bg-white shadow border rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-gray-400">Loading ordinands...</p>
        ) : ordinands.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-gray-500 italic">No ordinands have registered yet.</p>
            <p className="text-sm text-gray-400 mt-2">New users will appear here once they accept an invite and sign in.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ordinands.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {user.first_name || 'New'} {user.last_name || 'User'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-900 font-semibold text-sm">
                      Manage Requirements
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
