// app/dashboard/admin/candidates/[id]/page.tsx
// Ordinand detail: edit profile, reassign cohort, manage graders, grade submissions, send progress email
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { C, RATING_LABELS, STATUS_CONFIG, TYPE_LABELS, TOPIC_LABELS, type Rating, type Status } from '../../../../../lib/theme'
import { inputClass, labelClass, btnPrimary } from '../../../../../lib/formStyles'
import { useFlash } from '../../../../../hooks/useFlash'
import ViewAsUserModal from '../../../../components/ViewAsUserModal'
import GradeModal from './_components/GradeModal'
import SelfAssessmentModal from './_components/SelfAssessmentModal'
import EvalInviteModal from './_components/EvalInviteModal'
import EvalResponseModal from './_components/EvalResponseModal'
import InterviewBriefSection from './_components/InterviewBriefSection'

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [candidate, setCandidate] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [cohorts, setCohorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { message, flash } = useFlash(5000)

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false)
  const [editFirst, setEditFirst] = useState('')
  const [editLast, setEditLast] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCohortId, setEditCohortId] = useState('')
  const [editMentorName, setEditMentorName] = useState('')
  const [editMentorEmail, setEditMentorEmail] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Grading state
  const [reassigningId, setReassigningId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState<{ id: string; mode: 'unsubmitted' | 'submitted' } | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  // Admin upload state
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDate, setUploadDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [uploadRecordingUrl, setUploadRecordingUrl] = useState('')

  // Self-assessment modal state
  const [saReq, setSaReq] = useState<any | null>(null)

  // Grading state (modal internal state handled by GradeModal)
  const [selectedReqForGrade, setSelectedReqForGrade] = useState<any>(null)
  const [gradeInitialRating, setGradeInitialRating] = useState<Rating | ''>('')
  const [gradeInitialComments, setGradeInitialComments] = useState('')

  // External evaluation tokens
  const [evalTokens, setEvalTokens]           = useState<any[]>([])
  const [evalInviteModal, setEvalInviteModal] = useState<{ type: 'mentor' | 'church'; name: string; email: string } | null>(null)
  const [viewingEval, setViewingEval]         = useState<any>(null)

  // Grader exclusions
  const [exclusions, setExclusions] = useState<any[]>([])
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)

  // View as User
  const [showViewAs, setShowViewAs] = useState(false)
  const [viewAsOrdinands, setViewAsOrdinands] = useState<any[]>([])
  const [viewAsCouncil, setViewAsCouncil] = useState<any[]>([])
  const [viewAsLoading, setViewAsLoading] = useState(false)

  const [isObserver, setIsObserver] = useState(false)

  function denyObserver(): boolean {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return true }
    return false
  }

  async function handleAutoAssign() {
    if (denyObserver()) return
    setIsAutoAssigning(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/admin/auto-assign-graders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ordinand_id: id }),
      })
      const result = await res.json()
      if (!res.ok) { flash('Auto-assign failed: ' + (result.error ?? 'Unknown error'), 'error') }
      else {
        const msg = result.assigned > 0
          ? `${result.assigned} grader${result.assigned !== 1 ? 's' : ''} assigned.${result.skipped > 0 ? ` ${result.skipped} skipped.` : ''}`
          : result.skipped > 0 ? `No graders assigned — ${result.skipped} requirement(s) had no eligible grader.` : 'All requirements already have graders.'
        flash(msg, result.assigned > 0 ? 'success' : 'error')
        fetchData(true)
      }
    } catch {
      flash('Network error — please check your connection and try again.', 'error')
    }
    setIsAutoAssigning(false)
  }

  async function handleAddExclusion(councilMemberId: string) {
    if (denyObserver()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('grading_exclusions').insert({ ordinand_id: id, council_member_id: councilMemberId, created_by: user?.id })
    if (error) { flash('Error: ' + error.message, 'error') }
    else { fetchData(true) }
  }

  async function handleRemoveExclusion(exclusionId: string) {
    if (denyObserver()) return
    const { error } = await supabase.from('grading_exclusions').delete().eq('id', exclusionId)
    if (error) { flash('Error: ' + error.message, 'error') }
    else { fetchData(true) }
  }

  async function fetchViewAsUsers() {
    if (viewAsOrdinands.length > 0 || viewAsCouncil.length > 0) return
    setViewAsLoading(true)
    const { data } = await supabase.from('profiles')
      .select('id, first_name, last_name, email, roles, status')
      .neq('status', 'deleted').order('last_name')
    setViewAsOrdinands((data || []).filter((p: any) => p.roles?.includes('ordinand')))
    setViewAsCouncil((data || []).filter((p: any) => p.roles?.includes('council')))
    setViewAsLoading(false)
  }

  function openEvalInviteModal(type: 'mentor' | 'church') {
    setEvalInviteModal({
      type,
      name:  type === 'mentor' ? (candidate?.mentor_name  || '') : '',
      email: type === 'mentor' ? (candidate?.mentor_email || '') : '',
    })
  }


  async function fetchData(silent = false) {
    if (!silent) setLoading(true)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, cohorts(id, name, year, season, sermon_topic)')
      .eq('id', id)
      .single()
    setCandidate(profile)

    const { data: reqs } = await supabase
      .from('ordinand_requirements')
      .select(`id, status, updated_at, requirement_templates(id, type, topic, book_category, title, display_order), grading_assignments(id, council_member_id), submissions(id, file_url, self_assessment, grades(id, overall_rating, overall_comments, graded_at))`)
      .eq('ordinand_id', id)
      .order('id')
    setRequirements(reqs || [])

    const { data: council } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, grading_types')
      .contains('roles', ['council'])
      .order('last_name')
    setCouncilMembers(council || [])

    const { data: excl } = await supabase
      .from('grading_exclusions')
      .select('id, council_member_id')
      .eq('ordinand_id', id)
    setExclusions(excl || [])

    const { data: cohortList } = await supabase
      .from('cohorts')
      .select('id, name, year, season, sermon_topic')
      .order('year', { ascending: false })
    setCohorts(cohortList || [])

    const { data: tokens } = await supabase
      .from('evaluation_tokens')
      .select('id, token, eval_type, evaluator_name, status, submitted_at, created_at')
      .eq('ordinand_id', id)
      .order('created_at', { ascending: false })
    setEvalTokens(tokens || [])

    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchData()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('roles').eq('id', user.id).single().then(({ data: myProfile }) => {
          const myRoles: string[] = (myProfile as any)?.roles ?? []
          setIsObserver(myRoles.includes('observer') && !myRoles.includes('admin'))
        })
      }
    })
  }, [id])

  // Populate edit fields when candidate loads
  useEffect(() => {
    if (candidate) {
      setEditFirst(candidate.first_name || '')
      setEditLast(candidate.last_name || '')
      setEditEmail(candidate.email || '')
      setEditCohortId(candidate.cohort_id || '')
      setEditMentorName(candidate.mentor_name || '')
      setEditMentorEmail(candidate.mentor_email || '')
    }
  }, [candidate])

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
  const activeInProgress = requirements.filter(r => r.status === 'submitted' || r.status === 'under_review').length
  const revisionRequired = requirements.filter(r => r.status === 'revision_required').length
  const inProgress = activeInProgress + revisionRequired
  const notStarted = requirements.filter(r => r.status === 'not_started').length
  const completePct      = total > 0 ? Math.round((complete / total) * 100) : 0
  const activeInProgPct  = total > 0 ? Math.round((activeInProgress / total) * 100) : 0
  const revisionPct      = total > 0 ? Math.round((revisionRequired / total) * 100) : 0
  const progressPct = completePct

  async function handleUpdateProfile() {
    if (denyObserver()) return
    if (!candidate) return
    setIsSavingProfile(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editFirst.trim(),
        last_name: editLast.trim(),
        full_name: `${editFirst.trim()} ${editLast.trim()}`,
        email: editEmail.trim().toLowerCase(),
        cohort_id: editCohortId || null,
        mentor_name: editMentorName.trim() || null,
        mentor_email: editMentorEmail.trim().toLowerCase() || null,
      })
      .eq('id', id)
    if (error) {
      flash('Error updating profile: ' + error.message, 'error')
    } else {
      flash('Profile updated.', 'success')
      setEditingProfile(false)
      fetchData()
    }
    setIsSavingProfile(false)
  }

  function buildProgressEmail() {
    const name = `${candidate.first_name} ${candidate.last_name}`
    const cohortLabel = candidate.cohorts ? `${candidate.cohorts.season} ${candidate.cohorts.year}` : 'Unknown cohort'
    const subject = encodeURIComponent(`CMD Ordination Progress Update — ${name}`)

    const revisionItems = requirements
      .filter(r => r.status === 'revision_required')
      .map(r => `  • ${r.requirement_templates?.title ?? 'Unknown'} — Revision Required`)
      .join('\n')

    const submittedItems = requirements
      .filter(r => r.status === 'submitted' || r.status === 'under_review')
      .map(r => `  • ${r.requirement_templates?.title ?? 'Unknown'} — ${r.status === 'submitted' ? 'Submitted (awaiting review)' : 'Under Review'}`)
      .join('\n')

    const body = encodeURIComponent(
`Dear ${name},

Here is a summary of your current progress in the CMD ordination process.

OVERALL PROGRESS: ${progressPct}% (${complete} of ${total} requirements complete)

Cohort: ${cohortLabel}

SUMMARY
  ✓ Complete: ${complete}
  ◷ In Progress: ${inProgress}
  ○ Not Started: ${notStarted}${revisionItems ? `\n  ⚠ Revision Required: ${revisionRequired}` : ''}
${revisionItems ? `\nACTION REQUIRED — please revise and resubmit the following:\n${revisionItems}\n` : ''}${submittedItems ? `\nIN PROGRESS — currently under review:\n${submittedItems}\n` : ''}
If you have any questions, please reach out to the District Office.

In His service,
CMD Ordaining Council`
    )
    return `mailto:${candidate.email}?subject=${subject}&body=${body}`
  }

  async function handleAssignGrader(reqId: string, councilMemberId: string) {
    if (denyObserver()) return
    const { data: currentUser } = await supabase.auth.getUser()
    const { data: existing } = await supabase.from('grading_assignments').select('id').eq('ordinand_requirement_id', reqId).maybeSingle()
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

    // If the assignment already has a submission, notify the grader immediately
    const req = requirements.find(r => r.id === reqId)
    if (req && req.status !== 'not_started') {
      const { data: { session } } = await supabase.auth.getSession()
      fetch('/api/notify-grader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ requirementId: reqId }),
      }).then(r => r.json()).then(r => console.log('[notify-grader on assign]', r)).catch(() => {})
    }
  }

  async function handleResetSubmission(reqId: string, mode: 'unsubmitted' | 'submitted') {
    if (denyObserver()) return
    setIsResetting(true)
    const targetStatus = mode === 'unsubmitted' ? 'not_started' : 'submitted'
    const { error } = await supabase
      .from('ordinand_requirements')
      .update({ status: targetStatus })
      .eq('id', reqId)
    if (error) {
      flash('Error resetting submission: ' + error.message, 'error')
    } else {
      flash(
        mode === 'unsubmitted'
          ? 'Reverted to Unsubmitted. The ordinand will need to resubmit.'
          : 'Reverted to Ungraded. The submission is back in the grading queue.',
        'success'
      )
      setConfirmReset(null)
      fetchData()
    }
    setIsResetting(false)
  }

  async function handleAdminUpload(req: any, file: File, dateStr: string, recordingUrl?: string) {
    if (denyObserver()) return
    setIsUploading(true)
    const submittedAt = new Date(dateStr).toISOString()
    const ext = file.name.split('.').pop()
    const path = `submissions/${id}/${req.id}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      flash('Upload failed: ' + uploadError.message, 'error')
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(path)

    const existingSubmission = Array.isArray(req.submissions) ? req.submissions[0] : req.submissions
    let submissionId: string
    if (existingSubmission) {
      const isSermonReq = req.requirement_templates?.type === 'sermon'
      await supabase.from('submissions').update({ file_url: publicUrl, submitted_at: submittedAt, ...(isSermonReq ? { notes: recordingUrl?.trim() || null } : {}) }).eq('id', existingSubmission.id)
      submissionId = existingSubmission.id
    } else {
      const isSermonReq = req.requirement_templates?.type === 'sermon'
      const { data: newSub, error: subError } = await supabase.from('submissions').insert({
        ordinand_id: id,
        ordinand_requirement_id: req.id,
        file_url: publicUrl,
        file_name: file.name,
        version: 1,
        submitted_at: submittedAt,
        ...(isSermonReq ? { notes: recordingUrl?.trim() || null } : {}),
      }).select('id').single()
      if (subError) {
        flash('Upload succeeded but could not create submission record: ' + subError.message, 'error')
        setIsUploading(false)
        return
      }
      submissionId = newSub?.id
    }

    await supabase.from('ordinand_requirements').update({ status: 'submitted' }).eq('id', req.id)

    // Optimistically update local state — no fetchData needed, avoids concurrent batch races
    const updatedReq = {
      ...req,
      status: 'submitted',
      submissions: [{ id: submissionId, file_url: publicUrl, grades: [] }],
    }
    setRequirements(prev => prev.map(r => r.id === req.id ? updatedReq : r))
    setUploadingReqId(null)
    setIsUploading(false)
    flash('File uploaded. Use "Grade →" to add a grade when ready.', 'success')
  }

  function openSelfAssessmentModal(req: any) {
    setSaReq(req)
  }


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

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/handbook" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>📖 Handbook</Link>
          {!isObserver && <button onClick={() => { setShowViewAs(true); fetchViewAsUsers() }} style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>👁 View as User</button>}
          <Link href="/dashboard/admin?tab=candidates" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Admin Console</Link>
        </div>
      </header>

      <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-5xl mx-auto">

          {/* Page header */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
            <div>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Ordinand</p>
              <h1 className="text-3xl font-black mt-1" style={{ color: C.deepSea }}>
                {candidate.first_name} {candidate.last_name}
              </h1>
              <p className="text-slate-500 font-medium mt-1">{candidate.email}</p>
              {candidate.cohorts && (
                <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold capitalize">
                  {candidate.cohorts.season} {candidate.cohorts.year} Cohort
                  {candidate.cohorts.sermon_topic && ` · ${TOPIC_LABELS[candidate.cohorts.sermon_topic] ?? candidate.cohorts.sermon_topic} (sermon topic)`}
                </span>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-blue-300 hover:text-blue-600 transition-all"
                >
                  ✏️ Edit Profile
                </button>
              )}
              {!isObserver && requirements.some(r => !r.grading_assignments || (r.grading_assignments as any[]).length === 0) && (
                <button
                  onClick={handleAutoAssign}
                  disabled={isAutoAssigning}
                  className="px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all"
                  style={{ backgroundColor: isAutoAssigning ? '#aaa' : C.allianceBlue }}
                >
                  {isAutoAssigning ? 'Assigning…' : '⚡ Auto-assign Graders'}
                </button>
              )}
              <a
                href={buildProgressEmail()}
                className="px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all"
                style={{ backgroundColor: C.deepSea }}
              >
                📧 Send Progress Email
              </a>
            </div>
            {message.text && (
              <div className={`w-full px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
          </div>

          {/* Profile edit panel */}
          {editingProfile && (
            <div className="bg-white rounded-3xl border border-blue-200 shadow-sm p-8 mb-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Edit Profile</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input type="text" className={inputClass} value={editFirst} onChange={e => setEditFirst(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input type="text" className={inputClass} value={editLast} onChange={e => setEditLast(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" className={inputClass} value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                  <p className="text-xs text-slate-400 font-medium mt-1">Updates the portal profile only. To change the sign-in email, use Supabase Auth.</p>
                </div>
                <div>
                  <label className={labelClass}>Cohort</label>
                  <select
                    className={inputClass}
                    value={editCohortId}
                    onChange={e => setEditCohortId(e.target.value)}
                  >
                    <option value="">No cohort assigned</option>
                    {cohorts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.season} {c.year}{c.sermon_topic ? ` — ${TOPIC_LABELS[c.sermon_topic] ?? c.sermon_topic}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-amber-600 font-medium mt-1">⚠ Changing the cohort does not regenerate requirements. Contact support if reassignment is needed.</p>
                </div>
                <div>
                  <label className={labelClass}>Mentor Name</label>
                  <input type="text" className={inputClass} value={editMentorName} onChange={e => setEditMentorName(e.target.value)} placeholder="Rev. Jane Smith" />
                </div>
                <div>
                  <label className={labelClass}>Mentor Email</label>
                  <input type="email" className={inputClass} value={editMentorEmail} onChange={e => setEditMentorEmail(e.target.value)} placeholder="mentor@church.ca" />
                  <p className="text-xs text-slate-400 font-medium mt-1">Displayed to the ordinand on their Process Guide page.</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateProfile}
                  disabled={isSavingProfile}
                  className={btnPrimary}
                >
                  {isSavingProfile ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingProfile(false)
                    setEditFirst(candidate.first_name || '')
                    setEditLast(candidate.last_name || '')
                    setEditEmail(candidate.email || '')
                    setEditCohortId(candidate.cohort_id || '')
                    setEditMentorName(candidate.mentor_name || '')
                    setEditMentorEmail(candidate.mentor_email || '')
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Grader Exclusions */}
          {!isObserver && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Grader Exclusions</h2>
              <p className="text-xs text-slate-400 mb-4">Excluded council members will never be auto-assigned to this ordinand.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {exclusions.length === 0 && <span className="text-sm text-slate-400 font-medium">No exclusions set.</span>}
                {exclusions.map(excl => {
                  const member = councilMembers.find(m => m.id === excl.council_member_id)
                  return (
                    <span key={excl.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                      {member ? `${member.first_name} ${member.last_name}` : excl.council_member_id}
                      <button onClick={() => handleRemoveExclusion(excl.id)} className="hover:text-red-900 font-black leading-none">×</button>
                    </span>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                <select
                  defaultValue=""
                  onChange={e => { if (e.target.value) { handleAddExclusion(e.target.value); e.target.value = '' } }}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                >
                  <option value="" disabled>Add exclusion…</option>
                  {councilMembers
                    .filter(m => !exclusions.some(e => e.council_member_id === m.id))
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}{m.grading_types ? ` (${m.grading_types.join(', ')})` : ''}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          )}

          {/* Progress summary */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Overall Progress</h2>
              <span className="text-sm font-black text-slate-700">{complete} / {total} Complete</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden flex">
              {completePct > 0 && (
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${completePct}%` }} />
              )}
              {activeInProgPct > 0 && (
                <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${activeInProgPct}%` }} />
              )}
              {revisionPct > 0 && (
                <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${revisionPct}%` }} />
              )}
            </div>
            <div className="flex gap-6 text-xs font-bold flex-wrap">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500"></span><span className="text-green-600">{complete} Complete</span></span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400"></span><span className="text-amber-600">{activeInProgress} In Progress</span></span>
              {revisionRequired > 0 && <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400"></span><span className="text-red-500">{revisionRequired} Revision Required</span></span>}
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300"></span><span className="text-slate-400">{notStarted} Not Started</span></span>
            </div>
          </div>

          {/* Requirements by type */}
          {(['book_report', 'paper', 'sermon'] as const).map(type => {
            const items = grouped[type]
            if (!items || items.length === 0) return null
            return (
              <div key={type} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="px-8 py-5 border-b border-slate-100">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{TYPE_LABELS[type]} ({items.length})</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(req => {
                    const status: Status = req.status ?? 'not_started'
                    const statusCfg = STATUS_CONFIG[status]
                    const ga = Array.isArray(req.grading_assignments) ? req.grading_assignments[0] : req.grading_assignments
                    const grader = ga ? councilMembers.find((m: any) => m.id === ga.council_member_id) : null
                    const submission = Array.isArray(req.submissions) ? req.submissions[0] : req.submissions
                    const grade = submission ? (Array.isArray(submission.grades) ? submission.grades[0] : submission.grades) : null
                    const isReassigning = reassigningId === req.id
                    return (
                      <div key={req.id} className="px-8 py-5 hover:bg-slate-50 transition-colors">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-slate-900">{req.requirement_templates?.title}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.colour}`}>{statusCfg.label}</span>
                              {grade && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700">
                                  {RATING_LABELS[grade.overall_rating as Rating]}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              {grader
                                ? <span className="text-xs text-slate-500 font-medium">Grader: <span className="font-bold text-slate-700">{grader.first_name} {grader.last_name}</span></span>
                                : <span className="text-xs text-amber-600 font-bold">No grader assigned</span>
                              }
                              {!isReassigning ? (
                                <button
                                  onClick={() => setReassigningId(req.id)}
                                  className="text-xs text-blue-500 hover:text-blue-700 font-bold transition-colors"
                                >
                                  {grader ? 'Reassign' : 'Assign Grader'}
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select
                                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-100 outline-none"
                                    defaultValue=""
                                    onChange={e => e.target.value && handleAssignGrader(req.id, e.target.value)}
                                  >
                                    <option value="">Select council member…</option>
                                    {councilMembers.map(m => (
                                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => setReassigningId(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Cancel</button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Admin upload on behalf */}
                          {status !== 'complete' && (
                            uploadingReqId === req.id ? (
                              <div className="flex flex-col gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-black text-teal-700 whitespace-nowrap">Submission Date:</label>
                                  <input
                                    type="date"
                                    value={uploadDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={e => setUploadDate(e.target.value)}
                                    disabled={isUploading}
                                    className="text-xs px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-teal-200 outline-none"
                                  />
                                </div>
                                {req.requirement_templates?.type === 'sermon' && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-black text-teal-700 whitespace-nowrap">Recording URL (optional):</label>
                                    <input
                                      type="url"
                                      placeholder="https://www.youtube.com/watch?v=..."
                                      value={uploadRecordingUrl}
                                      onChange={e => setUploadRecordingUrl(e.target.value)}
                                      disabled={isUploading}
                                      className="text-xs px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-teal-200 outline-none w-full"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <label className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                                    {isUploading ? 'Uploading…' : '↑ Choose File'}
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      className="hidden"
                                      disabled={isUploading}
                                      onChange={e => {
                                        const file = e.target.files?.[0]
                                        if (file) handleAdminUpload(req, file, uploadDate, uploadRecordingUrl)
                                      }}
                                    />
                                  </label>
                                  {!isUploading && (
                                    <button onClick={() => setUploadingReqId(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Cancel</button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setUploadingReqId(req.id)
                                  setUploadDate(new Date().toISOString().split('T')[0])
                                  setUploadRecordingUrl('')
                                  setReassigningId(null)
                                  setConfirmReset(null)
                                }}
                                className="px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 transition-all"
                                title="Upload a file on behalf of this ordinand"
                              >
                                ↑ Upload
                              </button>
                            )
                          )}
                          {/* Self-assessment entry for paper requirements */}
                          {(() => {
                            const isPaper = req.requirement_templates?.type === 'paper'
                            const hasSub = !!(Array.isArray(req.submissions) ? req.submissions[0] : req.submissions)?.id
                            const hasSA = !!(Array.isArray(req.submissions) ? req.submissions[0] : req.submissions)?.self_assessment
                            if (!isPaper || !hasSub) return null
                            return (
                              <button
                                onClick={() => openSelfAssessmentModal(req)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${hasSA ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                                title={hasSA ? 'Edit ordinand self-assessment' : 'Add ordinand self-assessment'}
                              >
                                {hasSA ? '📋 Self-assessment ✓' : '📋 Self-assessment'}
                              </button>
                            )
                          })()}
                          {(status === 'submitted' || status === 'under_review') && (
                            <button
                              onClick={() => { setSelectedReqForGrade(req); setGradeInitialRating(grade?.overall_rating ?? ''); setGradeInitialComments(grade?.overall_comments ?? '') }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm"
                            >
                              Grade →
                            </button>
                          )}
                          {status === 'complete' && grade && (
                            <button
                              onClick={() => { setSelectedReqForGrade(req); setGradeInitialRating(grade.overall_rating); setGradeInitialComments(grade.overall_comments ?? '') }}
                              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                            >
                              View Grade
                            </button>
                          )}
                          {/* Reset button — available for any submitted/graded status */}
                          {status !== 'not_started' && (
                            confirmReset?.id === req.id ? (
                              <div className="flex flex-col gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                <span className="text-xs font-black text-amber-800">Revert this submission?</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleResetSubmission(req.id, 'submitted')}
                                    disabled={isResetting}
                                    className="text-xs font-black text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                                    title="Keep the file but return to the grading queue"
                                  >
                                    {isResetting ? '…' : '↩ To Ungraded'}
                                  </button>
                                  <span className="text-slate-300 text-xs">|</span>
                                  <button
                                    onClick={() => handleResetSubmission(req.id, 'unsubmitted')}
                                    disabled={isResetting}
                                    className="text-xs font-black text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                                    title="Clear submission — ordinand must resubmit"
                                  >
                                    {isResetting ? '…' : '✕ To Unsubmitted'}
                                  </button>
                                  <span className="text-slate-300 text-xs">|</span>
                                  <button
                                    onClick={() => setConfirmReset(null)}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmReset({ id: req.id, mode: 'submitted' })}
                                className="px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-amber-50 hover:text-amber-600 transition-all"
                                title="Revert submission status"
                              >
                                ↩ Revert
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {requirements.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <p className="text-slate-400 font-bold">No requirements found for this ordinand.</p>
              <p className="text-slate-300 text-sm font-medium mt-1">Requirements are generated automatically when a cohort is assigned during registration.</p>
            </div>
          )}

          {/* External Evaluations */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">External Evaluations</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Sent once, near the end of the ordinand's journey before the oral interview. Recipients complete the form without a portal account.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {(['mentor', 'church'] as const).map(type => {
                const typeLabel = type === 'mentor' ? 'Mentor Evaluation' : 'Church Board Evaluation'
                const icon      = type === 'mentor' ? '🤝' : '⛪'
                const tok       = evalTokens.find(t => t.eval_type === type)
                return (
                  <div key={type} className="px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{icon}</span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{typeLabel}</p>
                        {tok ? (
                          <div className="mt-1 space-y-0.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${tok.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {tok.status === 'submitted' ? '✓ Submitted' : '⏳ Awaiting response'}
                            </span>
                            <p className="text-xs text-slate-400 font-medium">
                              {tok.status === 'submitted'
                                ? `Received ${new Date(tok.submitted_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}${tok.evaluator_name ? ` · ${tok.evaluator_name}` : ''}`
                                : `Sent to ${tok.evaluator_name || 'recipient'}${tok.evaluator_email ? ` (${tok.evaluator_email})` : ''}`
                              }
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 font-medium mt-0.5">Not yet sent</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {tok?.status === 'submitted' ? (
                        <button
                          onClick={() => setViewingEval(tok)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                        >
                          View Response
                        </button>
                      ) : tok?.status === 'pending' ? (
                        <button
                          onClick={() => openEvalInviteModal(type)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                        >
                          Resend Invitation
                        </button>
                      ) : (
                        <button
                          onClick={() => openEvalInviteModal(type)}
                          className="px-4 py-2 bg-[#00426A] text-white rounded-xl text-xs font-bold hover:bg-[#003558] transition-all"
                        >
                          Send Invitation →
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <InterviewBriefSection candidate={candidate} ordinandId={id} />

          {/* Evaluation invitation modal */}
          {evalInviteModal && (
            <EvalInviteModal
              type={evalInviteModal.type}
              initialName={evalInviteModal.name}
              initialEmail={evalInviteModal.email}
              candidate={candidate}
              ordinandId={id}
              isObserver={isObserver}
              onClose={() => setEvalInviteModal(null)}
              onSent={() => { setEvalInviteModal(null); fetchData(true) }}
              flash={flash}
            />
          )}

          {/* Evaluation response modal */}
          {viewingEval && (
            <EvalResponseModal
              evalToken={viewingEval}
              candidate={candidate}
              onClose={() => setViewingEval(null)}
            />
          )}

          {/* Self-assessment modal */}
          {saReq && (
            <SelfAssessmentModal
              req={saReq}
              candidate={candidate}
              isObserver={isObserver}
              onClose={() => setSaReq(null)}
              onSaved={() => { setSaReq(null); fetchData() }}
              flash={flash}
            />
          )}

          {/* Grade modal */}
          {selectedReqForGrade && (
            <GradeModal
              req={selectedReqForGrade}
              candidate={candidate}
              councilMembers={councilMembers}
              initialRating={gradeInitialRating}
              initialComments={gradeInitialComments}
              isObserver={isObserver}
              onClose={() => { setSelectedReqForGrade(null); fetchData() }}
              onSaved={() => { setSelectedReqForGrade(null); fetchData() }}
              flash={flash}
            />
          )}

        </div>
      </main>

      {showViewAs && (
        <ViewAsUserModal
          onClose={() => setShowViewAs(false)}
          ordinands={viewAsOrdinands}
          councilMembers={viewAsCouncil}
          loading={viewAsLoading}
        />
      )}
    </div>
  )
}
