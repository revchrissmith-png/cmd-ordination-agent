// Iteration: v2.1 - Multi-role support (roles array)
// Tabs: Council Members | Cohorts | Candidates
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client'
import Link from 'next/link'

type Tab = 'council' | 'cohorts' | 'candidates'

const TOPICS = [
  { value: 'christ_centred',   label: 'Christ-Centred Life and Ministry' },
  { value: 'spirit_empowered', label: 'Spirit-Empowered Life and Ministry' },
  { value: 'mission_focused',  label: 'Mission-Focused Life and Ministry' },
  { value: 'scripture',        label: 'The Scriptures' },
  { value: 'divine_healing',   label: 'Divine Healing' },
]

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-blue-100 text-blue-700',
  council: 'bg-purple-100 text-purple-700',
  ordinand:'bg-slate-100 text-slate-600',
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('council')
  const [message, setMessage] = useState({ text: '', type: '' })

  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [councilLoading, setCouncilLoading] = useState(true)
  const [newCouncilEmail, setNewCouncilEmail] = useState('')
  const [newCouncilFirst, setNewCouncilFirst] = useState('')
  const [newCouncilLast, setNewCouncilLast] = useState('')
  const [newCouncilIsAdmin, setNewCouncilIsAdmin] = useState(false)
  const [isAddingCouncil, setIsAddingCouncil] = useState(false)

  const [cohorts, setCohorts] = useState<any[]>([])
  const [cohortsLoading, setCohortsLoading] = useState(true)
  const [newCohortName, setNewCohortName] = useState('')
  const [newCohortYear, setNewCohortYear] = useState(new Date().getFullYear().toString())
  const [newCohortSeason, setNewCohortSeason] = useState<'spring' | 'fall'>('fall')
  const [newCohortSermonTopic, setNewCohortSermonTopic] = useState('christ_centred')
  const [isAddingCohort, setIsAddingCohort] = useState(false)

  const [candidates, setCandidates] = useState<any[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [newCandidateEmail, setNewCandidateEmail] = useState('')
  const [newCandidateFirst, setNewCandidateFirst] = useState('')
  const [newCandidateLast, setNewCandidateLast] = useState('')
  const [newCandidateCohort, setNewCandidateCohort] = useState('')
  const [isAddingCandidate, setIsAddingCandidate] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  async function fetchCouncil() {
    setCouncilLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .contains('roles', ['council'])
      .order('last_name', { ascending: true })
    if (!error) setCouncilMembers(data || [])
    setCouncilLoading(false)
  }

  async function fetchCohorts() {
    setCohortsLoading(true)
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .order('year', { ascending: false })
    if (!error) setCohorts(data || [])
    setCohortsLoading(false)
  }

  async function fetchCandidates() {
    setCandidatesLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, cohorts(name)')
      .contains('roles', ['ordinand'])
      .order('last_name', { ascending: true })
    if (!error) setCandidates(data || [])
    setCandidatesLoading(false)
  }

  useEffect(() => {
    fetchCouncil()
    fetchCohorts()
    fetchCandidates()
  }, [])

  async function handleAddCouncil(e: React.FormEvent) {
    e.preventDefault()
    setIsAddingCouncil(true)
    const roles = newCouncilIsAdmin ? ['council', 'admin'] : ['council']
    const { error } = await supabase.from('profiles').insert([{
      email: newCouncilEmail.toLowerCase().trim(),
      first_name: newCouncilFirst.trim(),
      last_name: newCouncilLast.trim(),
      full_name: `${newCouncilFirst.trim()} ${newCouncilLast.trim()}`,
      roles,
    }])
    if (error) { flash('Error: ' + error.message, 'error') }
    else {
      flash(`${newCouncilFirst} ${newCouncilLast} added as council${newCouncilIsAdmin ? ' + admin' : ''}.`, 'success')
      setNewCouncilEmail(''); setNewCouncilFirst(''); setNewCouncilLast(''); setNewCouncilIsAdmin(false)
      fetchCouncil()
    }
    setIsAddingCouncil(false)
  }

  async function handleRemoveCouncil(member: any) {
    const name = `${member.first_name} ${member.last_name}`
    const hasAdmin = (member.roles || []).includes('admin')
    const confirmMsg = hasAdmin
      ? `Remove ${name} from the Ordaining Council?\n\nThey will keep their admin role. Existing grading assignments remain until manually reassigned.`
      : `Remove ${name} from the Ordaining Council?\n\nThis changes their role to ordinand. Existing grading assignments remain until manually reassigned.`
    if (!confirm(confirmMsg)) return
    const newRoles = (member.roles || []).filter((r: string) => r !== 'council')
    const finalRoles = newRoles.length > 0 ? newRoles : ['ordinand']
    const { error } = await supabase.from('profiles').update({ roles: finalRoles }).eq('id', member.id)
    if (error) { flash('Error: ' + error.message, 'error') }
    else { flash(`${name} removed from council.`, 'success'); fetchCouncil() }
  }

  async function handleAddCohort(e: React.FormEvent) {
    e.preventDefault()
    setIsAddingCohort(true)
    const name = newCohortName.trim() || `${newCohortSeason.charAt(0).toUpperCase() + newCohortSeason.slice(1)} ${newCohortYear}`
    const { error } = await supabase.from('cohorts').insert([{
      name, year: parseInt(newCohortYear), season: newCohortSeason, sermon_topic: newCohortSermonTopic,
    }])
    if (error) { flash('Error: ' + error.message, 'error') }
    else { flash(`Cohort "${name}" created.`, 'success'); setNewCohortName(''); fetchCohorts() }
    setIsAddingCohort(false)
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault()
    if (!newCandidateCohort) { flash('Please select a cohort before adding a candidate.', 'error'); return }
    setIsAddingCandidate(true)

    const { data: profile, error: profileError } = await supabase.from('profiles').insert([{
      email: newCandidateEmail.toLowerCase().trim(),
      first_name: newCandidateFirst.trim(),
      last_name: newCandidateLast.trim(),
      full_name: `${newCandidateFirst.trim()} ${newCandidateLast.trim()}`,
      roles: ['ordinand'],
      cohort_id: newCandidateCohort,
    }]).select().single()

    if (profileError) { flash('Error creating profile: ' + profileError.message, 'error'); setIsAddingCandidate(false); return }

    const { data: cohort } = await supabase.from('cohorts').select('sermon_topic').eq('id', newCandidateCohort).single()
    if (!cohort) { flash('Profile created but could not load cohort details.', 'error'); setIsAddingCandidate(false); return }

    const { data: templates } = await supabase.from('requirement_templates').select('id, type, topic, title')
    if (!templates) { flash('Profile created but could not load requirement templates.', 'error'); setIsAddingCandidate(false); return }

    const assigned = templates.filter(t => {
      if (t.type === 'book_report') return true
      if (t.type === 'paper') return t.topic !== cohort.sermon_topic
      if (t.type === 'sermon') return t.topic === cohort.sermon_topic && t.title !== 'Sermon: Scripture (placeholder)'
      return false
    })

    const rows = assigned.map(t => ({ ordinand_id: profile.id, template_id: t.id, cohort_id: newCandidateCohort, status: 'not_started' }))
    const { error: reqError } = await supabase.from('ordinand_requirements').insert(rows)

    if (reqError) { flash('Profile created but requirements failed: ' + reqError.message, 'error') }
    else {
      flash(`${newCandidateFirst} ${newCandidateLast} registered with ${rows.length} requirements generated.`, 'success')
      setNewCandidateEmail(''); setNewCandidateFirst(''); setNewCandidateLast(''); setNewCandidateCohort('')
      fetchCandidates()
    }
    setIsAddingCandidate(false)
  }

  function topicLabel(value: string) { return TOPICS.find(t => t.value === value)?.label ?? value }

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5"
  const btnPrimary = "bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-300 disabled:shadow-none"

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-10">
          <div>
            <Link href="/dashboard" className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors">← Dashboard</Link>
            <h1 className="text-3xl font-black text-slate-900 mt-1">Admin Console</h1>
          </div>
          {message.text && (
            <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="flex gap-1 mb-8 bg-white border border-slate-200 rounded-2xl p-1 w-fit shadow-sm">
          {(['council','cohorts','candidates'] as Tab[]).map(key => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === key ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:text-slate-800'}`}>
              {key === 'council' ? '⚖️  Council Members' : key === 'cohorts' ? '📅  Cohorts' : '👤  Candidates'}
            </button>
          ))}
        </div>

        {activeTab === 'council' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-5">Add Council Member</h2>
              <form onSubmit={handleAddCouncil} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>First Name</label><input className={inputClass} value={newCouncilFirst} onChange={e => setNewCouncilFirst(e.target.value)} placeholder="Jane" required /></div>
                  <div><label className={labelClass}>Last Name</label><input className={inputClass} value={newCouncilLast} onChange={e => setNewCouncilLast(e.target.value)} placeholder="Smith" required /></div>
                </div>
                <div><label className={labelClass}>Email Address</label><input className={inputClass} type="email" value={newCouncilEmail} onChange={e => setNewCouncilEmail(e.target.value)} placeholder="pastor@church.ca" required /></div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${newCouncilIsAdmin ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                    {newCouncilIsAdmin && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <input type="checkbox" className="sr-only" checked={newCouncilIsAdmin} onChange={e => setNewCouncilIsAdmin(e.target.checked)} />
                  <div>
                    <span className="font-bold text-slate-800 text-sm">Also grant Admin access</span>
                    <p className="text-xs text-slate-400 font-medium">Allows this person to manage cohorts, candidates, and council members.</p>
                  </div>
                </label>
                <button type="submit" disabled={isAddingCouncil} className={btnPrimary}>{isAddingCouncil ? 'Adding...' : 'Add Council Member'}</button>
              </form>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Council ({councilMembers.length})</h2>
              </div>
              {councilLoading ? <p className="px-8 py-12 text-slate-400 text-center font-medium">Loading...</p>
              : councilMembers.length === 0 ? <p className="px-8 py-12 text-slate-400 text-center font-medium">No council members added yet.</p>
              : (
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50"><tr>
                    <th className="px-8 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-8 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="px-8 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Roles</th>
                    <th className="px-8 py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {councilMembers.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4 font-bold text-slate-900">{m.first_name} {m.last_name}</td>
                        <td className="px-8 py-4 text-slate-500 font-medium">{m.email}</td>
                        <td className="px-8 py-4"><div className="flex flex-wrap gap-1">{(m.roles || []).map((r: string) => (
                          <span key={r} className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_BADGE[r] ?? 'bg-slate-100 text-slate-600'}`}>{r}</span>
                        ))}</div></td>
                        <td className="px-8 py-4 text-right"><button onClick={() => handleRemoveCouncil(m)} className="text-red-400 hover:text-red-600 font-bold text-sm transition-colors">Remove from Council</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium px-1">Removing a council member strips their council role only. Admin access and grading assignments are preserved until manually changed.</p>
          </div>
        )}

        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-5">Create New Cohort</h2>
              <form onSubmit={handleAddCohort} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Year</label><input className={inputClass} type="number" value={newCohortYear} onChange={e => setNewCohortYear(e.target.value)} required /></div>
                  <div><label className={labelClass}>Season</label>
                    <select className={inputClass} value={newCohortSeason} onChange={e => setNewCohortSeason(e.target.value as 'spring' | 'fall')}>
                      <option value="fall">Fall</option><option value="spring">Spring</option>
                    </select>
                  </div>
                </div>
                <div><label className={labelClass}>Cohort Name <span className="normal-case font-medium text-slate-400">(optional — auto-generated if blank)</span></label>
                  <input className={inputClass} value={newCohortName} onChange={e => setNewCohortName(e.target.value)} placeholder={`Fall ${newCohortYear}`} />
                </div>
                <div>
                  <label className={labelClass}>Sermon Topic</label>
                  <select className={inputClass} value={newCohortSermonTopic} onChange={e => setNewCohortSermonTopic(e.target.value)}>
                    {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">This topic generates 3 sermons. All other topics become papers for every ordinand in this cohort.</p>
                </div>
                <button type="submit" disabled={isAddingCohort} className={btnPrimary}>{isAddingCohort ? 'Creating...' : 'Create Cohort'}</button>
              </form>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">All Cohorts ({cohorts.length})</h2>
              </div>
              {cohortsLoading ? <p className="px-8 py-12 text-slate-400 text-center font-medium">Loading...</p>
              : cohorts.length === 0 ? <p className="px-8 py-12 text-slate-400 text-center font-medium">No cohorts created yet.</p>
              : (
                <div className="divide-y divide-slate-100">
                  {cohorts.map(c => (
                    <div key={c.id} className="px-8 py-6 hover:bg-slate-50 transition-colors">
                      <div className="font-bold text-slate-900 text-lg mb-1">{c.name}</div>
                      <div className="text-xs text-slate-400 font-medium capitalize mb-4">{c.season} {c.year}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                          <p className="text-xs font-black text-purple-500 uppercase tracking-widest mb-2">🎤 Sermon Topic (3 sermons)</p>
                          <p className="font-bold text-purple-900 text-sm">{topicLabel(c.sermon_topic)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">📄 Paper Topics (4 papers)</p>
                          <ul className="space-y-1">
                            {TOPICS.filter(t => t.value !== c.sermon_topic).map(t => (
                              <li key={t.value} className="text-sm text-slate-700 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />{t.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Register New Ordinand</h2>
              <p className="text-xs text-slate-400 font-medium mb-5">Adding a candidate automatically generates their 17 requirements based on their cohort. They will claim this profile when they first log in via Magic Link.</p>
              {cohorts.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-700 text-sm font-medium">
                  You need to create at least one cohort before registering candidates.{' '}
                  <button onClick={() => setActiveTab('cohorts')} className="font-black underline">Create a cohort →</button>
                </div>
              ) : (
                <form onSubmit={handleAddCandidate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>First Name</label><input className={inputClass} value={newCandidateFirst} onChange={e => setNewCandidateFirst(e.target.value)} placeholder="John" required /></div>
                    <div><label className={labelClass}>Last Name</label><input className={inputClass} value={newCandidateLast} onChange={e => setNewCandidateLast(e.target.value)} placeholder="Doe" required /></div>
                  </div>
                  <div><label className={labelClass}>Email Address</label><input className={inputClass} type="email" value={newCandidateEmail} onChange={e => setNewCandidateEmail(e.target.value)} placeholder="ordinand@church.ca" required /></div>
                  <div>
                    <label className={labelClass}>Assign to Cohort</label>
                    <select className={inputClass} value={newCandidateCohort} onChange={e => setNewCandidateCohort(e.target.value)} required>
                      <option value="">Select a cohort...</option>
                      {cohorts.map(c => <option key={c.id} value={c.id}>{c.name} — Sermons: {topicLabel(c.sermon_topic)}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={isAddingCandidate} className={btnPrimary}>{isAddingCandidate ? 'Registering...' : 'Register Candidate'}</button>
                </form>
              )}
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Registered Ordinands ({candidates.length})</h2>
              </div>
              {candidatesLoading ? <p className="px-8 py-12 text-slate-400 text-center font-medium">Loading...</p>
              : candidates.length === 0 ? <p className="px-8 py-12 text-slate-400 text-center font-medium">No candidates registered yet.</p>
              : (
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50"><tr>
                    <th className="px-8 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                    <th className="px-8 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Cohort</th>
                    <th className="px-8 py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map(person => (
                      <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-900">{person.first_name} {person.last_name}</div>
                          <div className="text-sm text-slate-400 font-medium">{person.email}</div>
                        </td>
                        <td className="px-8 py-5">
                          {person.cohorts?.name
                            ? <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{person.cohorts.name}</span>
                            : <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">No cohort</span>}
                        </td>
                        <td className="px-8 py-5 text-right"><Link href={`/dashboard/admin/candidates/${person.id}`} className="text-blue-600 font-black hover:text-blue-800 transition-colors text-sm">Manage →</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
