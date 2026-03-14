// app/dashboard/admin/candidates/[id]/page.tsx
// Candidate detail view: requirements list, progress, grader assignment, grading panel
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'

type Rating = 'insufficient' | 'adequate' | 'good' | 'excellent' | 'exceptional'
type Status = 'not_started' | 'submitted' | 'under_review' | 'revision_required' | 'complete'

const RATING_LABELS: Record<Rating, string> = {
  insufficient: 'Insufficient',
  adequate: 'Adequate',
  good: 'Good',
  excellent: 'Excellent',
  exceptional: 'Exceptional',
}

const STATUS_CONFIG: Record<Status, { label: string; colour: string }> = {
  not_started:       { label: 'Not Started',          colour: 'bg-slate-100 text-slate-500' },
  submitted:         { label: 'Submitted',             colour: 'bg-blue-100 text-blue-700' },
  under_review:      { label: 'Under Review',          colour: 'bg-amber-100 text-amber-700' },
  revision_required: { label: 'Revision Required',     colour: 'bg-red-100 text-red-700' },
  complete:          { label: 'Complete',               colour: 'bg-green-100 text-green-700' },
}

const TYPE_LABELS: Record<string, string> = {
  book_report: 'Book Reports',
  paper: 'Theological Papers',
  sermon: 'Sermons',
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>()
const id = params?.id ?? ''

  const [candidate, setCandidate] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [rating, setRating] = useState<Rating | ''>('')
  const [comments, setComments] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [reassigningId, setReassigningId] = useState<string | null>(null)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  async function fetchData() {
    setLoading(true)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, cohorts(name, sermon_topic)')
      .eq('id', id)
      .single()
    setCandidate(profile)
    const { data: reqs } = await supabase
      .from('ordinand_requirements')
      .select(`id, status, updated_at, requirement_templates(id, type, topic, book_category, title, display_order), grading_assignments(id, council_member_id, profiles(first_name, last_name)), submissions(id, file_url), grades(id, overall_rating, overall_comments, graded_at)`)
      .eq('ordinand_id', id)
      .order('id')
    setRequirements(reqs || [])
    const { data: council } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .contains('roles', ['council'])
      .order('last_name')
    setCouncilMembers(council || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const sorted = [...requirements].sort(
    (a, b) => (a.requirement_templates?.display_order ?? 0) - (b.requirement_templates?.display_order ?? 0)
  )
  const grouped = sorted.reduce((acc: Record<string, any[]>, req) => {
    const type = req.requirement_templates?.type ?? 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(req)
    return acc
  }, {})
  const total = requirements.length
  const complete = requirements.filter(r => r.status === 'complete').length
  const inProgress = requirements.filter(r => r.status !== 'not_started' && r.status !== 'complete').length
  const progressPct = total > 0 ? Math.round((complete / total) * 100) : 0

  async function handleAssignGrader(reqId: string, councilMemberId: string) {
    const { data: currentUser } = await supabase.auth.getUser()
    const { data: existing } = await supabase.from('grading_assignments').select('id').eq('ordinand_requirement_id', reqId).single()
    if (existing) {
      const { error } = await supabase.from('grading_assignments').update({ council_member_id: councilMemberId, reassigned_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) { flash('Error reassigning: ' + error.message, 'error'); return }
    } else {
      const { error } = await supabase.from('grading_assignments').insert({ ordinand_requirement_id: reqId, council_member_id: councilMemberId, assigned_by: currentUser.user?.id })
      if (error) { flash('Error assigning: ' + error.message, 'error'); return }
    }
    flash('Grader assigned.', 'success')
    setReassigningId(null)
    fetchData()
  }

  async function handleSaveGrade() {
    if (!selectedReq || !rating) return
    setIsSaving(true)
    const gaId = Array.isArray(selectedReq.grading_assignments) ? selectedReq.grading_assignments[0]?.id : selectedReq.grading_assignments?.id
    const submission = Array.isArray(selectedReq.submissions) ? selectedReq.submissions[0] : selectedReq.submissions
    if (!submission) { flash('No submission found to grade.', 'error'); setIsSaving(false); return }
    const { data: currentUser } = await supabase.auth.getUser()
    const { error: gradeError } = await supabase.from('grades').upsert({ submission_id: submission.id, grading_assignment_id: gaId, overall_rating: rating, overall_comments: comments, graded_by: currentUser.user?.id, graded_at: new Date().toISOString() }, { onConflict: 'submission_id' })
    if (gradeError) { flash('Error saving grade: ' + gradeError.message, 'error'); setIsSaving(false); return }
    const newStatus: Status = rating === 'insufficient' ? 'revision_required' : 'complete'
    await supabase.from('ordinand_requirements').update({ status: newStatus }).eq('id', selectedReq.id)
    flash('Grade saved.', 'success')
    setSelectedReq(null); setRating(''); setComments('')
    fetchData()
    setIsSaving(false)
  }

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5"
  const btnPrimary = "bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-300 disabled:shadow-none"

  const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading ordinand...
    </div>
  )
  if (!candidate) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Ordinand not found.
    </div>
  )

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <Link href="/dashboard/admin" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Admin Console</Link>
      </header>

    <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black mt-1" style={{ color: C.deepSea }}>{candidate.first_name} {candidate.last_name}</h1>
            <p className="text-slate-500 font-medium mt-1">{candidate.email}</p>
            {candidate.cohorts?.name && (<span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{candidate.cohorts.name}</span>)}
          </div>
          {message.text && (<div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>)}
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Overall Progress</h2>
            <span className="text-sm font-black text-slate-700">{complete} / {total} Complete</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-4"><div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progressPct}%` }} /></div>
          <div className="flex gap-6 text-xs font-bold">
            <span className="text-green-600">✓ {complete} Complete</span>
            <span className="text-amber-600">◷ {inProgress} In Progress</span>
            <span className="text-slate-400">○ {total - complete - inProgress} Not Started</span>
          </div>
        </div>
        {(['book_report', 'paper', 'sermon'] as const).map(type => {
          const items = grouped[type]
          if (!items || items.length === 0) return null
          return (
            <div key={type} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-8 py-5 border-b border-slate-100"><h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{TYPE_LABELS[type]} ({items.length})</h2></div>
              <div className="divide-y divide-slate-100">
                {items.map(req => {
                  const status: Status = req.status ?? 'not_started'
                  const statusCfg = STATUS_CONFIG[status]
                  const grader = Array.isArray(req.grading_assignments) ? req.grading_assignments[0]?.profiles : req.grading_assignments?.profiles
                  const grade = Array.isArray(req.grades) ? req.grades[0] : req.grades
                  const isReassigning = reassigningId === req.id
                  return (
                    <div key={req.id} className="px-8 py-5 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-bold text-slate-900">{req.requirement_templates?.title}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.colour}`}>{statusCfg.label}</span>
                            {grade && (<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700">{RATING_LABELS[grade.overall_rating as Rating]}</span>)}
                          </div>
                          <div className="mt-2 flex items-center gap-3 flex-wrap">
                            {grader ? (<span className="text-xs text-slate-500 font-medium">Grader: <span className="font-bold text-slate-700">{grader.first_name} {grader.last_name}</span></span>) : (<span className="text-xs text-amber-600 font-bold">No grader assigned</span>)}
                            {!isReassigning ? (
                              <button onClick={() => setReassigningId(req.id)} className="text-xs text-blue-500 hover:text-blue-700 font-bold transition-colors">{grader ? 'Reassign' : 'Assign Grader'}</button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-100 outline-none" defaultValue="" onChange={e => e.target.value && handleAssignGrader(req.id, e.target.value)}>
                                  <option value="">Select council member...</option>
                                  {councilMembers.map(m => (<option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>))}
                                </select>
                                <button onClick={() => setReassigningId(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Cancel</button>
                              </div>
                            )}
                          </div>
                        </div>
                        {(status === 'submitted' || status === 'under_review') && (
                          <button onClick={() => { setSelectedReq(req); setRating(grade?.overall_rating ?? ''); setComments(grade?.overall_comments ?? '') }} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm">Grade →</button>
                        )}
                        {status === 'complete' && grade && (
                          <button onClick={() => { setSelectedReq(req); setRating(grade.overall_rating); setComments(grade.overall_comments ?? '') }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">View Grade</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {selectedReq && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Grade Assignment</p>
                  <h3 className="text-xl font-black text-slate-900">{selectedReq.requirement_templates?.title}</h3>
                  <p className="text-sm text-slate-400 font-medium mt-1">{candidate.first_name} {candidate.last_name}</p>
                </div>
                <button onClick={() => { setSelectedReq(null); setRating(''); setComments('') }} className="text-slate-400 hover:text-slate-700 font-black text-xl transition-colors">✕</button>
              </div>
              <div>
                <label className={labelClass}>Rating</label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(RATING_LABELS) as Rating[]).map(r => (
                    <button key={r} onClick={() => setRating(r)} className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border-2 ${rating === r ? (r === 'insufficient' ? 'bg-red-500 text-white border-red-500' : 'bg-blue-600 text-white border-blue-600') : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>{RATING_LABELS[r]}</button>
                  ))}
                </div>
                {rating === 'insufficient' && (<p className="text-xs text-red-500 font-bold mt-2">⚠ Insufficient will mark this as Revision Required</p>)}
                {rating && rating !== 'insufficient' && (<p className="text-xs text-green-600 font-bold mt-2">✓ This rating will mark the assignment as Complete</p>)}
              </div>
              <div>
                <label className={labelClass}>Feedback Comments</label>
                <textarea className={`${inputClass} resize-none`} rows={4} value={comments} onChange={e => setComments(e.target.value)} placeholder="Provide feedback for the ordinand..." />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveGrade} disabled={!rating || isSaving} className={btnPrimary}>{isSaving ? 'Saving...' : 'Save Grade'}</button>
                <button onClick={() => { setSelectedReq(null); setRating(''); setComments('') }} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
    </div>
  )
}
