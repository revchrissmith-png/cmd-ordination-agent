// Iteration: v1.0 - Candidate Grading Assignment Manager
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../utils/supabase/client'
import Link from 'next/link'

type Requirement = {
  id: string
  status: string
  template: {
    type: string
    topic: string | null
    book_category: string | null
    title: string
    description: string | null
    sermon_question_index: number | null
    display_order: number
  }
  assignment: {
    id: string
    council_member_id: string
    notes: string | null
    council_member: {
      id: string
      first_name: string
      last_name: string
    }
  } | null
}

type CouncilMember = {
  id: string
  first_name: string
  last_name: string
  email: string
}

const TYPE_LABELS: Record<string, string> = {
  book_report: '📚 Book Reports',
  paper: '📄 Theological Papers',
  sermon: '🎤 Sermons',
}

const STATUS_BADGE: Record<string, string> = {
  not_started:       'bg-slate-100 text-slate-500',
  submitted:         'bg-blue-100 text-blue-700',
  under_review:      'bg-yellow-100 text-yellow-700',
  revision_required: 'bg-orange-100 text-orange-700',
  complete:          'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<string, string> = {
  not_started:       'Not Started',
  submitted:         'Submitted',
  under_review:      'Under Review',
  revision_required: 'Revision Required',
  complete:          'Complete',
}

export default function CandidateManagePage() {
  const params = useParams()
  const candidateId = params?.id as string

  const [candidate, setCandidate] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [council, setCouncil] = useState<CouncilMember[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [assignments, setAssignments] = useState<Record<string, { memberId: string; notes: string; saving: boolean }>>({})

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  useEffect(() => {
    if (!candidateId) return
    loadAll()
  }, [candidateId])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadCandidate(), loadRequirements(), loadCouncil()])
    setLoading(false)
  }

  async function loadCandidate() {
    const { data } = await supabase
      .from('profiles')
      .select('*, cohorts(name, sermon_topic)')
      .eq('id', candidateId)
      .single()
    setCandidate(data)
  }

  async function loadRequirements() {
    const { data, error } = await supabase
      .from('ordinand_requirements')
      .select(`
        id,
        status,
        template:requirement_templates (
          type, topic, book_category, title, description,
          sermon_question_index, display_order
        ),
        assignment:grading_assignments (
          id,
          council_member_id,
          notes,
          council_member:profiles!grading_assignments_council_member_id_fkey (
            id, first_name, last_name
          )
        )
      `)
      .eq('ordinand_id', candidateId)
      .order('id')

    if (error) { console.error(error); return }

    const reqs = (data || []) as unknown as Requirement[]
    const initAssignments: typeof assignments = {}
    for (const r of reqs) {
      initAssignments[r.id] = {
        memberId: r.assignment?.council_member_id ?? '',
        notes: r.assignment?.notes ?? '',
        saving: false,
      }
    }
    setAssignments(initAssignments)
    setRequirements(reqs)
  }

  async function loadCouncil() {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .contains('roles', ['council'])
      .order('last_name')
    setCouncil(data || [])
  }

  async function saveAssignment(req: Requirement) {
    const local = assignments[req.id]
    if (!local) return
    setAssignments(prev => ({ ...prev, [req.id]: { ...prev[req.id], saving: true } }))

    if (!local.memberId) {
      if (req.assignment?.id) {
        const { error } = await supabase.from('grading_assignments').delete().eq('id', req.assignment.id)
        if (error) flash('Error removing assignment: ' + error.message, 'error')
        else { flash('Assignment removed.', 'success'); loadRequirements() }
      }
    } else if (req.assignment?.id) {
      const { error } = await supabase
        .from('grading_assignments')
        .update({ council_member_id: local.memberId, notes: local.notes || null, reassigned_at: new Date().toISOString() })
        .eq('id', req.assignment.id)
      if (error) flash('Error updating assignment: ' + error.message, 'error')
      else { flash('Assignment updated.', 'success'); loadRequirements() }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('grading_assignments').insert({
        ordinand_requirement_id: req.id,
        council_member_id: local.memberId,
        notes: local.notes || null,
        assigned_by: user?.id,
      })
      if (error) flash('Error creating assignment: ' + error.message, 'error')
      else { flash('Marker assigned.', 'success'); loadRequirements() }
    }

    setAssignments(prev => ({ ...prev, [req.id]: { ...prev[req.id], saving: false } }))
  }

  const grouped = requirements.reduce<Record<string, Requirement[]>>((acc, r) => {
    const type = r.template?.type ?? 'unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(r)
    return acc
  }, {})
  for (const type of Object.keys(grouped)) {
    grouped[type].sort((a, b) => (a.template?.display_order ?? 0) - (b.template?.display_order ?? 0))
  }

  const assignedCount = requirements.filter(r => r.assignment?.council_member_id).length
  const totalCount = requirements.length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono text-blue-600">
      Loading candidate...
    </div>
  )

  if (!candidate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-slate-500 font-medium mb-4">Candidate not found.</p>
        <Link href="/dashboard/admin" className="text-blue-600 font-bold hover:underline">← Back to Admin</Link>
      </div>
    </div>
  )

  const inputClass = "px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all w-full"

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">

        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <Link href="/dashboard/admin" className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors">
              ← Admin Console
            </Link>
            <h1 className="text-3xl font-black text-slate-900 mt-1">
              {candidate.first_name} {candidate.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-slate-500 font-medium text-sm">{candidate.email}</span>
              {candidate.cohorts?.name && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                  {candidate.cohorts.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {message.text && (
              <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900">
                {assignedCount}<span className="text-slate-300">/{totalCount}</span>
              </div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Markers Assigned</div>
            </div>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(assignedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>

        <div className="space-y-8">
          {['book_report', 'paper', 'sermon'].map(type => {
            const reqs = grouped[type]
            if (!reqs || reqs.length === 0) return null

            return (
              <div key={type} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-black text-slate-900 text-lg">{TYPE_LABELS[type] ?? type}</h2>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {reqs.filter(r => r.assignment?.council_member_id).length}/{reqs.length} assigned
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {reqs.map(req => {
                    const local = assignments[req.id] ?? { memberId: '', notes: '', saving: false }
                    const isDirty =
                      local.memberId !== (req.assignment?.council_member_id ?? '') ||
                      local.notes !== (req.assignment?.notes ?? '')
                    const isAssigned = !!req.assignment?.council_member_id

                    return (
                      <div key={req.id} className="px-8 py-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm leading-snug">{req.template?.title}</p>
                            {req.template?.description && (
                              <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed line-clamp-2">
                                {req.template.description}
                              </p>
                            )}
                          </div>
                          <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[req.status] ?? STATUS_BADGE['not_started']}`}>
                            {STATUS_LABEL[req.status] ?? req.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 items-end">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                              Assigned Marker
                            </label>
                            <select
                              className={inputClass}
                              value={local.memberId}
                              onChange={e => setAssignments(prev => ({
                                ...prev,
                                [req.id]: { ...prev[req.id], memberId: e.target.value }
                              }))}
                            >
                              <option value="">— Unassigned —</option>
                              {council.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.first_name} {m.last_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                              Notes <span className="normal-case font-medium">(COI, etc.)</span>
                            </label>
                            <input
                              type="text"
                              className={inputClass}
                              placeholder="Optional note..."
                              value={local.notes}
                              onChange={e => setAssignments(prev => ({
                                ...prev,
                                [req.id]: { ...prev[req.id], notes: e.target.value }
                              }))}
                            />
                          </div>

                          <button
                            onClick={() => saveAssignment(req)}
                            disabled={local.saving || (!isDirty && isAssigned)}
                            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all flex-shrink-0 ${
                              local.saving
                                ? 'bg-slate-200 text-slate-400'
                                : isDirty
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                                  : isAssigned
                                    ? 'bg-slate-100 text-slate-400 cursor-default'
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            }`}
                          >
                            {local.saving ? 'Saving...' : isDirty ? 'Save' : isAssigned ? 'Saved ✓' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}
