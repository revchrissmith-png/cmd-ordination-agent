// Iteration: v1.0 - Grading Assignment UI
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Requirement = {
  id: string
  status: string
  template: {
    type: string
    topic: string | null
    title: string
    book_category: string | null
    sermon_question_index: number | null
    display_order: number
  }
  assignment: {
    id: string
    council_member_id: string
    notes: string | null
    council_member: {
      first_name: string
      last_name: string
      email: string
    }
  } | null
}

const TYPE_LABELS: Record<string, string> = {
  book_report: 'Book Report',
  paper: 'Theological Paper',
  sermon: 'Sermon',
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  graded: 'bg-green-100 text-green-700',
  resubmit: 'bg-red-100 text-red-700',
}

export default function CandidateManagePage() {
  const params = useParams()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [assigningReq, setAssigningReq] = useState<Requirement | null>(null)
  const [selectedCouncil, setSelectedCouncil] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  async function loadAll() {
    setLoading(true)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*, cohorts(name, sermon_topic)')
      .eq('id', candidateId)
      .single()
    setCandidate(prof)

    const { data: reqs } = await supabase
      .from('ordinand_requirements')
      .select(`
        id,
        status,
        template:requirement_templates(
          type, topic, title, book_category, sermon_question_index, display_order
        ),
        assignment:grading_assignments(
          id,
          council_member_id,
          notes,
          council_member:profiles!grading_assignments_council_member_id_fkey(
            first_name, last_name, email
          )
        )
      `)
      .eq('ordinand_id', candidateId)

    const flat = (reqs || []).map((r: any) => ({
      ...r,
      template: Array.isArray(r.template) ? r.template[0] : r.template,
      assignment: Array.isArray(r.assignment) ? (r.assignment[0] ?? null) : (r.assignment ?? null),
    })).map((r: any) => ({
      ...r,
      assignment: r.assignment ? {
        ...r.assignment,
        council_member: Array.isArray(r.assignment.council_member)
          ? r.assignment.council_member[0]
          : r.assignment.council_member,
      } : null,
    }))

    const ORDER = ['book_report', 'paper', 'sermon']
    flat.sort((a: any, b: any) => {
      const typeOrder = ORDER.indexOf(a.template?.type) - ORDER.indexOf(b.template?.type)
      if (typeOrder !== 0) return typeOrder
      return (a.template?.display_order ?? 0) - (b.template?.display_order ?? 0)
    })

    setRequirements(flat)

    const { data: council } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .contains('roles', ['council'])
      .order('last_name', { ascending: true })
    setCouncilMembers(council || [])

    setLoading(false)
  }

  useEffect(() => {
    if (candidateId) loadAll()
  }, [candidateId])

  function openAssign(req: Requirement) {
    setAssigningReq(req)
    setSelectedCouncil(req.assignment?.council_member_id ?? '')
    setAssignNotes(req.assignment?.notes ?? '')
  }

  async function saveAssignment() {
    if (!assigningReq || !selectedCouncil) return
    setIsSaving(true)

    if (assigningReq.assignment) {
      const { error } = await supabase
        .from('grading_assignments')
        .update({
          council_member_id: selectedCouncil,
          notes: assignNotes || null,
          reassigned_at: new Date().toISOString(),
        })
        .eq('id', assigningReq.assignment.id)
      if (error) flash('Error: ' + error.message, 'error')
      else flash('Assignment updated.', 'success')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('grading_assignments')
        .insert([{
          ordinand_requirement_id: assigningReq.id,
          council_member_id: selectedCouncil,
          assigned_by: user?.id,
          notes: assignNotes || null,
        }])
      if (error) flash('Error: ' + error.message, 'error')
      else flash('Assignment saved.', 'success')
    }

    setAssigningReq(null)
    setIsSaving(false)
    loadAll()
  }

  async function removeAssignment(req: Requirement) {
    if (!req.assignment) return
    if (!confirm('Remove this grading assignment?')) return
    const { error } = await supabase
      .from('grading_assignments')
      .delete()
      .eq('id', req.assignment.id)
    if (error) flash('Error: ' + error.message, 'error')
    else flash('Assignment removed.', 'success')
    loadAll()
  }

  const grouped = requirements.reduce((acc, req) => {
    const type = req.template?.type ?? 'unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(req)
    return acc
  }, {} as Record<string, Requirement[]>)

  const assignedCount = requirements.filter(r => r.assignment).length
  const totalCount = requirements.length
  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800"

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono text-blue-600">
      Loading candidate...
    </div>
  )

  if (!candidate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">Candidate not found.</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">

        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <Link href="/dashboard/admin" className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors">
              ← Admin Console
            </Link>
            <h1 className="text-3xl font-black text-slate-900 mt-1">
              {candidate.first_name} {candidate.last_name}
            </h1>
            <p className="text-slate-500 font-medium mt-1">{candidate.email}</p>
            {candidate.cohorts?.name && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                {candidate.cohorts.name}
              </span>
            )}
          </div>

          <div className="text-right">
            {message.text && (
              <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm mb-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm text-center">
              <div className="text-3xl font-black text-slate-900">{assignedCount}<span className="text-slate-300">/{totalCount}</span></div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Requirements Assigned</div>
            </div>
          </div>
        </div>

        {['book_report', 'paper', 'sermon'].map(type => {
          const reqs = grouped[type]
          if (!reqs || reqs.length === 0) return null
          return (
            <div key={type} className="mb-8">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                {TYPE_LABELS[type]}s ({reqs.length})
              </h2>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest w-1/2">Requirement</th>
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                      <th className="px-6 py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reqs.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-sm leading-snug">{req.template?.title}</div>
                          {req.assignment?.notes && (
                            <div className="mt-1 text-xs text-amber-600 font-medium">⚠️ COI: {req.assignment.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[req.status] ?? 'bg-slate-100 text-slate-500'}`}>
                            {(req.status ?? 'not_started').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {req.assignment?.council_member ? (
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{req.assignment.council_member.first_name} {req.assignment.council_member.last_name}</div>
                              <div className="text-xs text-slate-400 font-medium">{req.assignment.council_member.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm font-medium italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openAssign(req)} className="text-blue-600 hover:text-blue-800 font-bold text-sm transition-colors">
                              {req.assignment ? 'Reassign' : 'Assign'}
                            </button>
                            {req.assignment && (
                              <button onClick={() => removeAssignment(req)} className="text-red-400 hover:text-red-600 font-bold text-sm transition-colors">
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {requirements.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
            <p className="text-slate-400 font-medium">No requirements found for this candidate.</p>
          </div>
        )}

      </div>

      {assigningReq && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
            <h3 className="text-xl font-black text-slate-900 mb-1">
              {assigningReq.assignment ? 'Reassign' : 'Assign'} Council Member
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Requirement = {
  id: string
  status: string
  template: {
    type: string
    topic: string | null
    title: string
    book_category: string | null
    sermon_question_index: number | null
    display_order: number
  }
  assignment: {
    id: string
    council_member_id: string
    notes: string | null
    council_member: {
      first_name: string
      last_name: string
      email: string
    }
  } | null
}

const TYPE_LABELS: Record<string, string> = {
  book_report: 'Book Report',
  paper: 'Theological Paper',
  sermon: 'Sermon',
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  graded: 'bg-green-100 text-green-700',
  resubmit: 'bg-red-100 text-red-700',
}

export default function CandidateManagePage() {
  const params = useParams()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [assigningReq, setAssigningReq] = useState<Requirement | null>(null)
  const [selectedCouncil, setSelectedCouncil] = useState('')
  const [assignNotes, setAssignNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  async function loadAll() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*, cohorts(name, sermon_topic)').eq('id', candidateId).single()
    setCandidate(prof)
    const { data: reqs } = await supabase.from('ordinand_requirements').select(`id, status, template:requirement_templates(type, topic, title, book_category, sermon_question_index, display_order), assignment:grading_assignments(id, council_member_id, notes, council_member:profiles!grading_assignments_council_member_id_fkey(first_name, last_name, email))`).eq('ordinand_id', candidateId)
    const flat = (reqs || []).map((r: any) => ({ ...r, template: Array.isArray(r.template) ? r.template[0] : r.template, assignment: Array.isArray(r.assignment) ? (r.assignment[0] ?? null) : (r.assignment ?? null) })).map((r: any) => ({ ...r, assignment: r.assignment ? { ...r.assignment, council_member: Array.isArray(r.assignment.council_member) ? r.assignment.council_member[0] : r.assignment.council_member } : null }))
    const ORDER = ['book_report', 'paper', 'sermon']
    flat.sort((a: any, b: any) => { const t = ORDER.indexOf(a.template?.type) - ORDER.indexOf(b.template?.type); return t !== 0 ? t : (a.template?.display_order ?? 0) - (b.template?.display_order ?? 0) })
    setRequirements(flat)
    const { data: council } = await supabase.from('profiles').select('id, first_name, last_name, email').contains('roles', ['council']).order('last_name', { ascending: true })
    setCouncilMembers(council || [])
    setLoading(false)
  }

  useEffect(() => { if (candidateId) loadAll() }, [candidateId])

  function openAssign(req: Requirement) { setAssigningReq(req); setSelectedCouncil(req.assignment?.council_member_id ?? ''); setAssignNotes(req.assignment?.notes ?? '') }

  async function saveAssignment() {
    if (!assigningReq || !selectedCouncil) return
    setIsSaving(true)
    if (assigningReq.assignment) {
      const { error } = await supabase.from('grading_assignments').update({ council_member_id: selectedCouncil, notes: assignNotes || null, reassigned_at: new Date().toISOString() }).eq('id', assigningReq.assignment.id)
      if (error) flash('Error: ' + error.message, 'error'); else flash('Assignment updated.', 'success')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('grading_assignments').insert([{ ordinand_requirement_id: assigningReq.id, council_member_id: selectedCouncil, assigned_by: user?.id, notes: assignNotes || null }])
      if (error) flash('Error: ' + error.message, 'error'); else flash('Assignment saved.', 'success')
    }
    setAssigningReq(null); setIsSaving(false); loadAll()
  }

  async function removeAssignment(req: Requirement) {
    if (!req.assignment || !confirm('Remove this grading assignment?')) return
    const { error } = await supabase.from('grading_assignments').delete().eq('id', req.assignment.id)
    if (error) flash('Error: ' + error.message, 'error'); else flash('Assignment removed.', 'success')
    loadAll()
  }

  const grouped = requirements.reduce((acc, req) => { const type = req.template?.type ?? 'unknown'; if (!acc[type]) acc[type] = []; acc[type].push(req); return acc }, {} as Record<string, Requirement[]>)
  const assignedCount = requirements.filter(r => r.assignment).length
  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800"

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono text-blue-600">Loading candidate...</div>
  if (!candidate) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500">Candidate not found.</p></div>

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <Link href="/dashboard/admin" className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors">← Admin Console</Link>
            <h1 className="text-3xl font-black text-slate-900 mt-1">{candidate.first_name} {candidate.last_name}</h1>
            <p className="text-slate-500 font-medium mt-1">{candidate.email}</p>
            {candidate.cohorts?.name && <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{candidate.cohorts.name}</span>}
          </div>
          <div className="text-right">
            {message.text && <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm mb-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>}
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm text-center">
              <div className="text-3xl font-black text-slate-900">{assignedCount}<span className="text-slate-300">/{requirements.length}</span></div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Requirements Assigned</div>
            </div>
          </div>
        </div>

        {['book_report', 'paper', 'sermon'].map(type => {
          const reqs = grouped[type]
          if (!reqs?.length) return null
          return (
            <div key={type} className="mb-8">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{TYPE_LABELS[type]}s ({reqs.length})</h2>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-100"><tr>
                    <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest w-1/2">Requirement</th>
                    <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                    <th className="px-6 py-3 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {reqs.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-sm leading-snug">{req.template?.title}</div>
                          {req.assignment?.notes && <div className="mt-1 text-xs text-amber-600 font-medium">⚠️ COI: {req.assignment.notes}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[req.status] ?? 'bg-slate-100 text-slate-500'}`}>{(req.status ?? 'not_started').replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4">
                          {req.assignment?.council_member
                            ? <div><div className="font-bold text-slate-800 text-sm">{req.assignment.council_member.first_name} {req.assignment.council_member.last_name}</div><div className="text-xs text-slate-400 font-medium">{req.assignment.council_member.email}</div></div>
                            : <span className="text-slate-400 text-sm font-medium italic">Unassigned</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openAssign(req)} className="text-blue-600 hover:text-blue-800 font-bold text-sm transition-colors">{req.assignment ? 'Reassign' : 'Assign'}</button>
                            {req.assignment && <button onClick={() => removeAssignment(req)} className="text-red-400 hover:text-red-600 font-bold text-sm transition-colors">Remove</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {requirements.length === 0 && <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center"><p className="text-slate-400 font-medium">No requirements found for this candidate.</p></div>}
      </div>

      {assigningReq && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
            <h3 className="text-xl font-black text-slate-900 mb-1">{assigningReq.assignment ? 'Reassign' : 'Assign'} Council Member</h3>
            <p className="text-slate-500 text-sm font-medium mb-6 leading-snug">{assigningReq.template?.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Council Member</label>
                <select className={inputClass} value={selectedCouncil} onChange={e => setSelectedCouncil(e.target.value)}>
                  <option value="">Select a council member...</option>
                  {councilMembers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} — {m.email}</option>)}
                </select>
                {councilMembers.length === 0 && <p className="text-amber-600 text-xs font-medium mt-1.5">No council members found. Add them in Admin Console first.</p>}
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">COI / Notes <span className="normal-case font-medium text-slate-400">(optional)</span></label>
                <textarea className={`${inputClass} resize-none h-24`} value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Note any conflict of interest or relevant context..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAssigningReq(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={saveAssignment} disabled={!selectedCouncil || isSaving} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none">
                {isSaving ? 'Saving...' : assigningReq.assignment ? 'Update Assignment' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
    }
