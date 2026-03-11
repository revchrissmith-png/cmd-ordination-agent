// Iteration: v1.1
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client' // Relative path
import { useProfile } from '../../../hooks/use-profile' // Relative path

export default function AdminPage() {
  const { isAdmin, loading: profileLoading } = useProfile()
  const [ordinands, setOrdinands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrdinands() {
      if (!isAdmin) return
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'ordinand')
      if (!error) setOrdinands(data)
      setLoading(false)
    }
    if (!profileLoading && isAdmin) fetchOrdinands()
  }, [isAdmin, profileLoading])

  if (profileLoading || loading) return <p className="p-8 text-center text-gray-500">Loading Admin Console...</p>
  if (!isAdmin) return <p className="p-12 text-center text-red-600 font-bold">Unauthorized</p>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">District Administration</h1>
      <div className="bg-white shadow border rounded-xl">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200">
            {ordinands.map((u) => (
              <tr key={u.id}><td className="px-6 py-4 font-semibold">{u.email}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
