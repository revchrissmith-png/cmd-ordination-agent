// app/dashboard/admin/candidate/[id]/page.tsx
// Grading Assignment UI — assign council members to each of an ordinand's 17 requirements
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../../utils/supabase/client'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  book_report: 'Book Reports',
  paper: 'Theological Papers',
  sermon: 'Sermons',
}

const TYPE_ICONS: Record<string, string> = {
  book_report: '📚',
  paper: '📝',
  sermon: '🎤',
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  graded: 'bg-green-100 text-green-700',
}

type Requirement = {
  id: string
  status: string
  template: {
    id: string
    type: string
    topic: string
    title: string
    book_category: string | null
    sermon_question_index: number | null
    display_order: number
  }
  assignment: {
    id: string
    council_member_id: string
    notes: string
  } | null
}

export default function CandidateManagePage() {
  const params = useParams()
  const ordinandId = params.id as string

  const [ordinand, setOrdinand] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState({ text: '', type: '' })
  const [assignments, setAssignments] = useState<Record<string, { councilId: string; notes: string }>>({})

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  async function loadData() {
    setLoading(true)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*, cohorts(name, sermon_topic)')
      .eq('id', ordinandId)
      .single()
    setOrdinand(prof)

    const { data: council } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .contains('roles', ['council'])
      .order('last_name')
    setCouncilMembers(council || [])

    const { data: reqs } = await supabase
      .from('ordinand_requirements')
      .select(`
        id,
        status,
        template:requirement_templates (
          id, type, topic, title, book_category, sermon_question_index, display_order
        ),
        assignment:grading_assignments (
          id, council_member_id, notes
        )
      `)
      .eq('ordinand_id', ordinandId)
      .order('id')

    if (reqs) {
      const normalized: Requirement[] = reqs.map((r: any) => ({
        id: r.id,
        status: r.status,
        template: Array.isArray(r.template) ? r.template[0] : r.template,
        assignment: Array.isArray(r.assignment) ? (r.assignment[0] ?? null) : (r.assignment ?? null),
      }))

      const typeOrder = ['book_report', 'paper', 'sermon']
      normalized.sort((a, b) => {
        const ta = typeOrder.indexOf(a.template?.type)
        const tb = typeOrder.indexOf(b.template?.type)
        if (ta !== tb) return ta - tb
        return (a.template?.display_order ?? 0) - (b.template?.display_order ?? 0)
      })

      setRequirements(normalized)

      const init: Record<string, { councilId: string; notes: string }> = {}
      normalized.forEach(r => {
        init[r.id] = {
          councilId: r.assignment?.council_member_id ?? '',
          notes: r.assignment?.notes ?? '',
        }
      })
      setAssignments(init)
    }

    setLoading(false)
  }

  useEffect(() => { loadData() }, [ordinandId])

  async function saveAssignment(reqId: string) {
    const { councilId, notes } = assignments[reqId] ?? {}
    setSaving(s => ({ ...s, [reqId]: true }))
    const req = requirements.find(r => r.id === reqId)

    if (!councilId) {
      if (req?.assignment?.id) {
        const { error } = await supabase.from('grading_assignments').delete().eq('id', req.assignment.id)
        if (error) flash('Error removing assignment: ' + error.message, 'error')
        else { flash('Assignment removed.', 'success'); await loadData() }
      }
      setSaving(s => ({ ...s, [reqId]: false }))
      return
    }

    if (req?.assignment?.id) {
      const { error } = await supabase.from('grading_assignments')
        .update({ council_member_id: councilId, notes: notes || null, reassigned_at: new Date().toISOString() })
        .eq('id', req.assignment.id)
      if (error) flash('Error: ' + error.message, 'error')
      else {
        setSaved(s => ({ ...s, [reqId]: true }))
        setTimeout(() => setSaved(s => ({ ...s, [reqId]: false })), 2000)
        await loadData()
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('grading_assignments').insert({
        ordinand_requirement_id: reqId,
        council_member_id: councilId,
        assigned_by: user?.id,
        notes: notes || null,
      })
      if (error) flash('Error: ' + error.message, 'error')
      else {
        setSaved(s => ({ ...s, [reqId]: true }))
        setTimeout(() => setSaved(s => ({ ...s, [reqId]: false })), 2000)
        await loadData()
      }
    }
    setSaving(s => ({ ...s, [reqId]: false }))
  }

  async function handleBulkAssign(councilId: string) {
    if (!councilId) return
    const unassigned = requirements.filter(r => !r.assignment)
    if (unassigned.length === 0) { flash('All requirements already assigned.', 'success'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const rows = unassigned.map(r => ({
      ordinand_requirement_id: r.id,
      council_member_id: councilId,
      assigned_by: user?.id,
    }))
    const { error } = await supabase.from('grading_assignments').insert(rows)
    if (error) flash('Bulk assign error: ' + error.message, 'error')
    else {
      flash(`Assigned ${rows.length} requirements to ${councilMembers.find(c => c.id === councilId)?.last_name}.`, 'success')
      await loadData()
    }
  }

  const grouped = requirements.reduce((acc, r) => {
    const type = r.template?.type ?? 'unknown'
    if (!acc[type]) acc[type] = []
    acc[type].push(r)
    return acc
  }, {} as Record<string, Requirement[]>)

  const assignedCount = requirements.filter(r => r.assignment).length
  const totalCount = requirements.length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-mono text-blue-600">
      Loading candidate...
    </div>
  )

  if (!ordinand) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-slate-500 font-medium mb-4">Candidate not found.</p>
        <Link href="/dashboard/admin" className="text-blue-600 font-bold">← Back to Admin</Link>
      </div>
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
              {ordinand.first_name} {ordinand.last_name}
            </h1>
            <p className="text-slate-400 font-medium mt-0.5">{ordinand.email}</p>
            {ordinand.cohorts?.name && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                {ordinand.cohorts.name}
              </span>
            )}
          </div>
          {message.text && (
            <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Assignment Progress</h2>
            <span className="text-sm font-bold text-slate-700">{assignedCount} / {totalCount} assigned</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(assignedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>

          {councilMembers.length > 0 && assignedCount < totalCount && (
            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Bulk Assign Unassigned ({totalCount - assignedCount}) to:
                </label>
                <select
                  id="bulk-select"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  defaultValue=""
                >
                  <option value="">Select a council member...</option>
                  {councilMembers.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  const sel = document.getElementById('bulk-select') as HTMLSelectElement
                  handleBulkAssign(sel.value)
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 text-sm"
              >
                Assign All Unassigned
              </button>
            </div>
          )}
          {councilMembers.length === 0 && (
            <p className="mt-3 text-xs text-amber-600 font-medium">
              ⚠️ No council members found. Add council members in the Council tab before assigning.
            </p>
          )}
        </div>

        {['book_report', 'paper', 'sermon'].map(type => {
          const reqs = grouped[type]
          if (!reqs || reqs.length === 0) return null
          return (
            <div key={type} className="mb-8">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xl">{TYPE_ICONS[type]}</span>
                <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest">
                  {TYPE_LABELS[type]} ({reqs.length})
                </h2>
                <div className="flex-1 h-px bg-slate-200 ml-2" />
                <span className="text-xs font-bold text-slate-400">
                  {reqs.filter(r => r.assignment).length}/{reqs.length} assigned
                </span>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {reqs.map((req, idx) => {
                    const localAssign = assignments[req.id] ?? { councilId: '', notes: '' }
                    const isAssigned = !!req.assignment
                    const isSaving = saving[req.id]
                    const justSaved = saved[req.id]
                    const isDirty =
                      localAssign.councilId !== (req.assignment?.council_member_id ?? '') ||
                      localAssign.notes !== (req.assignment?.notes ?? '')

                    return (
                      <div key={req.id} className={`p-5 transition-colors ${isAssigned ? 'hover:bg-slate-50' : 'hover:bg-amber-50/30'}`}>
                        <div className="flex flex-wrap gap-4 items-start">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-slate-300 w-5 text-right flex-shrink-0">{idx + 1}</span>
                              <span className="font-bold text-slate-800 text-sm leading-snug">{req.template?.title ?? 'Untitled'}</span>
                            </div>
                            {req.template?.book_category && (
                              <span className="ml-7 text-xs font-medium text-slate-400 capitalize">
                                Category: {req.template.book_category.replace(/_/g, ' ')}
                              </span>
                            )}
                            <div className="ml-7 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[req.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                {req.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 items-end flex-shrink-0">
                            <div>
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Council Member</label>
                              <select
                                value={localAssign.councilId}
                                onChange={e => setAssignments(a => ({ ...a, [req.id]: { ...a[req.id], councilId: e.target.value } }))}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 transition-all min-w-[180px]"
                              >
                                <option value="">— Unassigned —</option>
                                {councilMembers.map(c => (
                                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">COI Notes</label>
                              <input
                                type="text"
                                value={localAssign.notes}
                                onChange={e => setAssignments(a => ({ ...a, [req.id]: { ...a[req.id], notes: e.target.value } }))}
                                placeholder="Conflict of interest notes..."
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 transition-all w-52 placeholder:text-slate-300"
                              />
                            </div>
                            <button
                              onClick={() => saveAssignment(req.id)}
                              disabled={isSaving || !isDirty}
                              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                justSaved ? 'bg-green-500 text-white'
                                : isDirty ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                                : 'bg-slate-100 text-slate-400 cursor-default'
                              }`}
                            >
                              {isSaving ? '...' : justSaved ? '✓ Saved' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

      </div>
    </main>
  )
}
