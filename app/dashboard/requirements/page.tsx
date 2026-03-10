// Iteration: v1.0
// Location: GitHub -> app/dashboard/requirements/page.tsx
// Purpose: A page for candidates to see their ordination checklist.

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useProfile } from '@/hooks/use-profile'

export default function RequirementsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [requirements, setRequirements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRequirements() {
      if (!profile) return
      
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('profile_id', profile.id)

      if (!error) setRequirements(data)
      setLoading(false)
    }

    if (profile) fetchRequirements()
  }, [profile])

  if (profileLoading || loading) return <p className="p-8">Loading requirements...</p>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Ordination Checklist</h1>
      <div className="space-y-4">
        {requirements.length === 0 ? (
          <p className="text-gray-500">No requirements assigned yet. Contact the District Office.</p>
        ) : (
          requirements.map((req) => (
            <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-semibold">{req.title}</h3>
                <p className="text-sm text-gray-600">{req.notes}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                req.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {req.status.replace('_', ' ')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
