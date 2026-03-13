// app/dashboard/admin/candidates/[id]/page.tsx
// Candidate Management — Grading Assignment UI
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../../utils/supabase/client'
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
  not_started: 'bg-slate-100 text-slate-500',
  in_progress:  'bg-amber-50 text-amber-600',
  submitted:    'bg-blue-50 text-blue-600',
  graded:       'bg-green-50 text-green-700',
}

export default function CandidateManagePage() {
  const params = useParams()
  const candidateId = params?.id as string

  const [candidate, setCandidate] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [council, setCouncil] = useState<CouncilMember[]>([])
  const [loading, setLoading] = useState(true)

  const [assignments, setAssignments] = useState<Record<string, { memberId: string; notes: string }>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [flash, setFlash] = useState({ text: '', type: '' })

  useEffect(() => {
    if (!candidateId) return
    loadAll()
  }, [candidateId])

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
        requirement_templates (
          type, topic, book_category, title, description, sermon_question_index, display_order
        ),
        grading_assignments (
          id, council_member_id, notes
        )
      `)
      .eq('ordinand_id', candidateId)

    const mapped: Requirement[] = (reqs || []).map((r: any) => ({
      id: r.id,
      status: r.status,
      template: r.requirement_templates,
      assignment: r.grading_assignments?.[0] ?? null,
    })).sort((a: Requirement, b: Requirement) => {
      const typeOrder: Record<string, number> = { book_report: 0, paper: 1, sermon: 2 }
      const typeDiff = (typeOrder[a.template.type] ?? 9) - (typeOrder[b.template.type] ?? 9)
      if (typeDiff !== 0) return typeDiff
      return (a.template.display_order ?? 0) - (b.template.display_order ?? 0)
    })

    setRequirements(mapped)

    const initial: Record<string, { memberId: string; notes: string }> = {}
    mapped.forEach((r: Requirement) => {
      initial[r.id] = {
        memberId: r.assignment?.council_member_id ?? '',
        notes: r.assignment?.notes ?? '',
      }
    })
    setAssignments(initial)

    const { data: councilData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .contains('roles', ['council'])
      .order('last_name', { ascending: true })
    setCouncil(councilData || [])

    setLoading(false)
  }

  function showFlash(text: string, type: 'success' | 'error') {
    setFlash({ text, type })
    setTimeout(() => setFlash({ text: '', type: '' }), 4000)
  }

  async function saveAssignment(req: Requirement) {
    const { memberId, notes } = assignments[req.id] ?? {}
    setSaving(s => ({ ...s, [req.id]: true }))

    if (!memberId) {
      if (req.assignment?.id) {
        const { error } = await supabase
          .from('grading_assignments')
          .delete()
          .eq('id', req.assignment.id)
        if (error) { showFlash('Error removing: ' + error.message, 'error') }
        else { showFlash('Assignment removed.', 'success'); loadAll() }
      }
      setSaving(s => ({ ...s, [req.id]: false }))
      return
    }

    if (req.assignment?.id) {
      const { error } = await supabase
        .from('grading_assignments')
        .update({ council_member_id: memberId, notes: notes || null })
        .eq('id', req.assignment.id)
      if (error) { showFlash('Error: ' + error.message, 'error') }
      else { showFlash('Assignment updated.', 'success'); loadAll() }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('grading_assignments')
        .insert([{
          ordinand_requirement_id: req.id,
          council_member_id: memberId,
          assigned_by: user?.id,
          notes: notes || null,
        }])
      if (error) { showFlash('Error: ' + error.message, 'error') }
      else { showFlash('Assigned successfully.', 'success'); loadAll() }
    }

    setSaving(s => ({ ...s, [req.id]: false }))
    setSaved(s => ({ ...s, [req.id]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [req.id]: false })), 2000)
  }

  const grouped = ['book_report', 'paper', 'sermon'].map(type => ({
    type,
    items: requirements.filter(r => r.template.type === type),
  })).filter(g => g.items.length > 0)

  const totalAssigned = requirements.filter(r => r.assignment?.council_member_id).length
  const totalReqs = requirements.length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono text-blue-600 text-sm">
      Loading candidate...
    </div>
  )

  if (!candidate) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500 font-medium">Candidate not found.</p>
    </div>
  )

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
            <p className="text-slate-400 font-medium text-sm mt-1">{candidate.email}</p>
            {candidate.cohorts?.name && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                {candidate.cohorts.name}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {flash.text && (
              <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${
                flash.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {flash.text}
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-center shadow-sm">
              <div className="text-2xl font-black text-slate-900">{totalAssigned}<span className="text-slate-300">/{totalReqs}</span></div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Assigned</div>
            </div>
          </div>
        </div>

        {council.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 text-amber-700 text-sm font-medium mb-6">
            No council members found. <Link href="/dashboard/admin" className="font-black underline">Add council members →</Link>
          </div>
        )}

        <div className="space-y-8">
          {grouped.map(({ type, items }) => (
            <div key={type} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                  {TYPE_LABELS[type]}
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {items.filter(r => r.assignment?.council_member_id).length}/{items.length} assigned
                </span>
              </div>

              <div className="divide-y divide-slate-50">
                {items.map((req, idx) => {
                  const local = assignments[req.id] ?? { memberId: '', notes: '' }
                  const hasChange =
                    local.memberId !== (req.assignment?.council_member_id ?? '') ||
                    local.notes !== (req.assignment?.notes ?? '')
                  const isAssigned = !!req.assignment?.council_member_id
                  const isSaving = saving[req.id]
                  const justSaved = saved[req.id]

                  return (
                    <div key={req.id} className={`px-8 py-6 transition-colors ${isAssigned ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 text-sm">{req.template.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[req.status] ?? 'bg-slate-100 text-slate-500'}`}>
                              {req.status.replace('_', ' ')}
                            </span>
                          </div>
                          {req.template.description && (
                            <p className="text-xs text-slate-400 font-medium">{req.template.description}</p>
                          )}
                          {req.template.book_category && (
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Category: {req.template.book_category.replace(/_/g, ' ')}</p>
                          )}
                        </div>
                      </div>

                      <div className="ml-11 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned Marker</label>
                          <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            value={local.memberId}
                            onChange={e => setAssignments(a => ({ ...a, [req.id]: { ...a[req.id], memberId: e.target.value } }))}
                          >
                            <option value="">— Unassigned —</option>
                            {council.map(m => (
                              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            COI Notes <span className="normal-case font-medium text-slate-300">(optional)</span>
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                            placeholder="Conflict of interest notes..."
                            value={local.notes}
                            onChange={e => setAssignments(a => ({ ...a, [req.id]: { ...a[req.id], notes: e.target.value } }))}
                          />
                        </div>

                        <button
                          onClick={() => saveAssignment(req)}
                          disabled={isSaving || (!hasChange && !justSaved)}
                          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap disabled:opacity-60 ${
                            justSaved ? 'bg-green-500 text-white'
                              : hasChange ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                              : 'bg-slate-100 text-slate-400 cursor-default'
                          }`}
                        >
                          {isSaving ? 'Saving...' : justSaved ? '✓ Saved' : hasChange ? 'Save' : isAssigned ? 'Assigned' : 'Unassigned'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {requirements.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-8 py-16 text-center">
            <p className="text-slate-400 font-medium">No requirements found for this candidate.</p>
            <p className="text-slate-300 text-sm font-medium mt-1">They may have been created before auto-generation was implemented.</p>
          </div>
        )}

      </div>
    </main>
  )
}
