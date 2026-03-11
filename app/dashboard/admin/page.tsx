// Iteration: v1.0 - Admin Candidate Manager
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client'
import Link from 'next/link'

export default function AdminPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    fetchCandidates()
  }, [])

  async function fetchCandidates() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'ordinand')
      .order('created_at', { ascending: false })

    if (!error) setCandidates(data)
    setLoading(false)
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault()
    setIsAdding(true)
    
    // This adds the user to the profiles table so the system recognizes them
    const { error } = await supabase
      .from('profiles')
      .insert([{ 
        email: newEmail.toLowerCase(), 
        role: 'ordinand',
        first_name: 'New',
        last_name: 'Candidate'
      }])

    if (error) {
      alert("Error adding candidate: " + error.message)
    } else {
      setNewEmail('')
      fetchCandidates()
    }
    setIsAdding(false)
  }

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-blue-900 text-center flex-grow">Candidate Management</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {/* Add New Candidate Form */}
        <div className="bg-blue-50 p-6 rounded-xl mb-10 border border-blue-100">
          <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4">Register New Ordinand</h2>
          <form onSubmit={handleAddCandidate} className="flex gap-4">
            <input 
              type="email" 
              placeholder="candidate@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-grow px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <button 
              disabled={isAdding}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {isAdding ? 'Adding...' : 'Add Candidate'}
            </button>
          </form>
        </div>

        {/* Candidate List */}
        <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">Loading candidates...</td></tr>
              ) : candidates.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No candidates registered yet.</td></tr>
              ) : (
                candidates.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person.first_name} {person.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        In Progress
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button className="text-blue-600 hover:text-blue-900 font-bold">Review →</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
