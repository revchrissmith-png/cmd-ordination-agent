// Iteration: v1.1 - Secure Candidate Manager
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client'
import Link from 'next/link'

export default function AdminPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

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
    setMessage({ text: '', type: '' })
    
    // We insert the profile using the email as the primary identifier
    // The "Simple profile access" policy we ran earlier will allow them 
    // to "claim" this row once they log in.
    const { error } = await supabase
      .from('profiles')
      .insert([{ 
        email: newEmail.toLowerCase().trim(), 
        role: 'ordinand',
        first_name: 'New',
        last_name: 'Candidate'
      }])

    if (error) {
      setMessage({ text: "Error: " + error.message, type: 'error' })
    } else {
      setMessage({ text: `Successfully added ${newEmail}!`, type: 'success' })
      setNewEmail('')
      fetchCandidates()
    }
    setIsAdding(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <Link href="/dashboard" className="text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-slate-900">Candidate Management</h1>
          <div className="w-24"></div> 
        </div>

        {/* Add New Candidate Form */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-10">
          <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">Register New Ordinand</h2>
          <form onSubmit={handleAddCandidate} className="flex flex-col md:flex-row gap-4">
            <input 
              type="email" 
              placeholder="candidate@canadianmidwest.ca"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-grow px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
              required
            />
            <button 
              disabled={isAdding}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300"
            >
              {isAdding ? 'Adding...' : 'Add Candidate'}
            </button>
          </form>
          {message.text && (
            <p className={`mt-4 text-sm font-bold ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>

        {/* Candidate List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-400 font-medium">Loading candidate roster...</td></tr>
              ) : candidates.length === 0 ? (
                <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-400 font-medium">No candidates registered yet.</td></tr>
              ) : (
                candidates.map((person) => (
                  <tr key={person.id || person.email} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900">{person.first_name} {person.last_name}</div>
                      <div className="text-sm text-slate-500 font-medium">{person.email}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-600">
                        Active Candidate
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-blue-600 font-black hover:text-blue-800 transition-colors">Review Progress →</button>
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
