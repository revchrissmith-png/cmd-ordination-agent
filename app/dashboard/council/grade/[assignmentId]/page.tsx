// app/dashboard/council/grade/[assignmentId]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { logActivity } from '../../../../../utils/logActivity'
import { SELF_ASSESSMENT_TOPICS, PAPER_SECTIONS } from '../../../../../utils/selfAssessmentQuestions'
import {
  TOTAL_RUBRIC_CRITERIA,
  suggestRubricGrade,
  type SermonRubricScores,
} from '../../../../../utils/sermonRubric'
import { C, RATINGS, type Rating } from '../../../../../lib/theme'
import { inputClass } from '../../../../../lib/formStyles'
import { useFlash } from '../../../../../hooks/useFlash'
import SermonRubric from './_components/SermonRubric'
import PaperAssessment from './_components/PaperAssessment'

const RATING_CONFIG: Record<Rating, { colour: string; label: string }> = {
  insufficient: { colour: 'border-red-400 bg-red-50 text-red-700',         label: 'Insufficient' },
  adequate:     { colour: 'border-amber-400 bg-amber-50 text-amber-700',    label: 'Adequate' },
  good:         { colour: 'border-blue-400 bg-blue-50 text-blue-700',       label: 'Good' },
  excellent:    { colour: 'border-green-400 bg-green-50 text-green-700',    label: 'Excellent' },
  exceptional:  { colour: 'border-purple-400 bg-purple-50 text-purple-700', label: 'Exceptional' },
}

export default function CouncilGradePage() {
  const params = useParams<{ assignmentId: string }>()
  const assignmentId = params?.assignmentId ?? ''

  const [assignment, setAssignment]       = useState<any>(null)
  const [requirement, setRequirement]     = useState<any>(null)
  const [submission, setSubmission]       = useState<any>(null)
  const [existingGrade, setExistingGrade] = useState<any>(null)
  const [loading, setLoading]             = useState(true)
  const { message, flash }               = useFlash()

  // Grade state
  const [rating, setRating]           = useState<Rating | ''>('')
  const [comments, setComments]       = useState('')
  const [rubricScores, setRubricScores] = useState<SermonRubricScores>({})
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({})
  const [paperFeedback, setPaperFeedback] = useState<Record<string, string>>({})
  const [paperSectionRatings, setPaperSectionRatings] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving]       = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [isObserver, setIsObserver]   = useState(false)

  function denyObserver(): boolean {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return true }
    return false
  }

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: myProfile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
      const myRoles: string[] = myProfile?.roles ?? []
      setIsObserver(myRoles.includes('observer') && !myRoles.includes('admin'))
    }
    const { data: assign } = await supabase
      .from('grading_assignments')
      .select('id, ordinand_requirement_id, council_member_id')
      .eq('id', assignmentId)
      .single()
    setAssignment(assign)
    if (!assign) { setLoading(false); return }

    const { data: req } = await supabase
      .from('ordinand_requirements')
      .select(`id, status, ordinand_id,
        requirement_templates(id, type, topic, title),
        profiles!ordinand_id(full_name, email)`)
      .eq('id', assign.ordinand_requirement_id)
      .single()
    setRequirement(req)

    const { data: sub } = await supabase
      .from('submissions')
      .select('id, file_url, notes, selected_book, self_assessment, submitted_at')
      .eq('ordinand_requirement_id', assign.ordinand_requirement_id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()
    setSubmission(sub)

    if (sub) {
      const { data: g } = await supabase
        .from('grades')
        .select('id, overall_rating, overall_comments, graded_at, sermon_rubric, sermon_section_comments, paper_assessment, is_draft')
        .eq('submission_id', sub.id)
        .single()
      if (g) {
        setExistingGrade(g)
        if (g.overall_rating) setRating(g.overall_rating)
        setComments(g.overall_comments || '')
        if (g.sermon_rubric)                    setRubricScores(g.sermon_rubric)
        if (g.sermon_section_comments)          setSectionComments(g.sermon_section_comments)
        if (g.paper_assessment?.sections)       setPaperFeedback(g.paper_assessment.sections)
        if (g.paper_assessment?.section_ratings) setPaperSectionRatings(g.paper_assessment.section_ratings)
        if (g.is_draft)                         setDraftSavedAt(g.graded_at)
      }
    }
    if (req) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) logActivity(user.id, 'grading_view', `/dashboard/council/grade/${assignmentId}`, {
        title: (req.requirement_templates as any)?.title,
        type: (req.requirement_templates as any)?.type,
        ordinand: (req.profiles as any)?.full_name,
      })
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [assignmentId])

  const isPaper  = requirement?.requirement_templates?.type === 'paper'
  const isSermon = requirement?.requirement_templates?.type === 'sermon'
  const isBook   = requirement?.requirement_templates?.type === 'book_report'
  const topic    = requirement?.requirement_templates?.topic
  const topicData = topic ? SELF_ASSESSMENT_TOPICS[topic] : null

  const isNewFormatSA = submission?.self_assessment?.version === 2
  const saSections    = submission?.self_assessment?.sections || {}
  const oldAnswers: Record<string, string>  = submission?.self_assessment?.answers         || {}
  const oldRatings: Record<string, string>  = submission?.self_assessment?.self_assessments || {}

  // Sermon rubric validation
  const scoredCount     = Object.values(rubricScores).filter(v => v > 0).length
  const suggestedGrade  = suggestRubricGrade(rubricScores)
  const allRubricScored = !isSermon || scoredCount >= TOTAL_RUBRIC_CRITERIA

  // Paper section feedback validation (new format only)
  const allPaperFeedback = !isPaper || !isNewFormatSA ||
    PAPER_SECTIONS.every(s => (paperFeedback[s.id] || '').trim().length > 0)

  async function handleSaveDraft() {
    if (denyObserver()) return
    if (!submission) { flash('No submission found.', 'error'); return }
    setIsSavingDraft(true)
    try {
      const now = new Date().toISOString()
      const draftData: any = {
        overall_rating:   rating || null,
        overall_comments: comments,
        graded_at:        now,
        is_draft:         true,
      }
      if (isSermon) {
        draftData.sermon_rubric = rubricScores
        draftData.sermon_section_comments = sectionComments
      }
      if (isPaper && isNewFormatSA) {
        draftData.paper_assessment = {
          version: 2,
          sections: { ...paperFeedback },
          section_ratings: { ...paperSectionRatings },
        }
      }
      if (existingGrade) {
        await supabase.from('grades').update(draftData).eq('id', existingGrade.id)
      } else {
        const { data: inserted } = await supabase.from('grades').insert({
          submission_id:        submission.id,
          grading_assignment_id: assignment.id,
          graded_by:            assignment.council_member_id,
          ...draftData,
        }).select().single()
        if (inserted) setExistingGrade(inserted)
      }
      setDraftSavedAt(now)
      flash('Draft saved.', 'success')
    } catch (err: any) { flash('Error saving draft: ' + err.message, 'error') }
    setIsSavingDraft(false)
  }

  async function handleSaveGrade() {
    if (denyObserver()) return
    if (!rating) { flash('Please select an overall rating before saving.', 'error'); return }
    if (!submission) { flash('No submission found to grade.', 'error'); return }
    if (isSermon && !allRubricScored) {
      flash(`Please complete all ${TOTAL_RUBRIC_CRITERIA} rubric criteria before saving.`, 'error'); return
    }
    if (isPaper && isNewFormatSA && !allPaperFeedback) {
      flash('Please provide feedback for all six assessment sections before saving.', 'error'); return
    }

    setIsSaving(true)
    try {
      const gradeData: any = {
        overall_rating:   rating,
        overall_comments: comments,
        graded_at:        new Date().toISOString(),
        is_draft:         false,
      }
      if (isSermon) {
        gradeData.sermon_rubric = rubricScores
        gradeData.sermon_section_comments = sectionComments
      }
      if (isPaper && isNewFormatSA) {
        gradeData.paper_assessment = {
          version: 2,
          sections: { ...paperFeedback },
          section_ratings: { ...paperSectionRatings },
        }
      }

      if (existingGrade) {
        await supabase.from('grades').update({
          ...gradeData,
          graded_by: assignment.council_member_id,
        }).eq('id', existingGrade.id)
      } else {
        await supabase.from('grades').insert({
          submission_id:        submission.id,
          grading_assignment_id: assignment.id,
          graded_by:            assignment.council_member_id,
          ...gradeData,
        })
      }
      const newStatus = rating === 'insufficient' ? 'revision_required' : 'complete'
      // Update requirement status server-side (service role bypasses RLS)
      const { data: { session } } = await supabase.auth.getSession()
      const statusRes = await fetch('/api/council/complete-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ requirementId: requirement.id, status: newStatus }),
      })
      if (!statusRes.ok) {
        const err = await statusRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update requirement status')
      }
      flash('Grade saved successfully.', 'success')
      const { data: { user } } = await supabase.auth.getUser()
      if (user) logActivity(user.id, 'grade_submitted', `/dashboard/council/grade/${assignmentId}`, {
        title: requirement?.requirement_templates?.title,
        ordinand: requirement?.profiles?.full_name,
        rating,
        outcome: newStatus,
      })
      // Notify ordinand by email — authenticated fire and forget
      fetch('/api/notify-ordinand-graded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          requirementId: requirement.id,
          graderId: assignment.council_member_id,
          outcome: newStatus,
        }),
      }).catch(() => {})
      fetchData()
    } catch (err: any) { flash('Error saving grade: ' + err.message, 'error') }
    setIsSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading assignment...
    </div>
  )
  if (!assignment || !requirement) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Assignment not found.
    </div>
  )

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </a>
        <Link href="/dashboard/council" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← My Assignments</Link>
      </header>

      <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-6xl mx-auto">

          <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black mt-1" style={{ color: C.deepSea }}>{requirement.requirement_templates?.title}</h1>
              <p className="text-slate-500 font-medium mt-1">
                {requirement.profiles?.full_name}
                <span className="text-slate-300 mx-2">·</span>
                <span className="text-slate-400 text-sm">{requirement.profiles?.email}</span>
              </p>
            </div>
            {message.text && (
              <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
          </div>

          {!submission && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
              <p className="text-amber-700 font-bold">No submission has been received for this requirement yet.</p>
            </div>
          )}

          {submission && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* ── Left column: submission + assessment ── */}
              <div className="lg:col-span-3 space-y-4">

                {/* Submission card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">
                    {isBook ? 'Submitted Book Report' : isSermon ? 'Submitted Sermon' : 'Submitted Paper'}
                  </h2>
                  {isBook && submission.selected_book && (
                    <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Book:</span>
                      <span className="text-sm font-bold text-slate-800">{submission.selected_book}</span>
                    </div>
                  )}
                  {isSermon && submission.notes && (
                    <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Recording:</span>
                      <a href={submission.notes} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold text-sm underline truncate">{submission.notes}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Submitted {new Date(submission.submitted_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold text-sm underline">Open manuscript →</a>
                    </div>
                  </div>
                </div>

                {/* ── Sermon rubric ── */}
                {isSermon && (
                  <SermonRubric
                    rubricScores={rubricScores}
                    setRubricScores={setRubricScores}
                    sectionComments={sectionComments}
                    setSectionComments={setSectionComments}
                    scoredCount={scoredCount}
                  />
                )}

                {/* ── Paper assessment ── */}
                {isPaper && topicData && (
                  <PaperAssessment
                    topicData={topicData}
                    isNewFormatSA={isNewFormatSA}
                    saSections={saSections}
                    oldAnswers={oldAnswers}
                    oldRatings={oldRatings}
                    activeQuestion={activeQuestion}
                    setActiveQuestion={setActiveQuestion}
                    paperFeedback={paperFeedback}
                    setPaperFeedback={setPaperFeedback}
                    paperSectionRatings={paperSectionRatings}
                    setPaperSectionRatings={setPaperSectionRatings}
                  />
                )}

                {/* Book report — no assessment */}
                {isBook && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                    <p className="text-slate-400 font-medium text-sm">No self-assessment form for book reports.</p>
                  </div>
                )}

              </div>

              {/* ── Right column: grade panel ── */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sticky top-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
                  <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Overall Grade</h2>
                  <p className="text-xs text-slate-400 font-medium mb-6">{existingGrade ? `Last graded ${new Date(existingGrade.graded_at).toLocaleDateString()}` : 'Not yet graded'}</p>

                  {/* Sermon rubric suggestion */}
                  {isSermon && (
                    <div className={`mb-5 rounded-2xl p-4 border transition-all ${scoredCount === TOTAL_RUBRIC_CRITERIA && suggestedGrade ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rubric Progress</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(scoredCount / TOTAL_RUBRIC_CRITERIA) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 shrink-0">{scoredCount}/{TOTAL_RUBRIC_CRITERIA}</span>
                      </div>
                      {suggestedGrade ? (
                        <p className="text-sm font-bold text-blue-700">Rubric suggests: <span className="capitalize">{suggestedGrade}</span></p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium">Complete all criteria to see suggested grade</p>
                      )}
                    </div>
                  )}

                  {/* Paper section completion indicator */}
                  {isPaper && isNewFormatSA && (
                    <div className={`mb-5 rounded-2xl p-4 border transition-all ${allPaperFeedback ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Section Feedback</p>
                      <div className="space-y-1.5">
                        {PAPER_SECTIONS.map((s, i) => {
                          const done = (paperFeedback[s.id] || '').trim().length > 0
                          return (
                            <div key={s.id} className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-black ${done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                {done ? '✓' : i + 1}
                              </span>
                              <span className={`text-xs font-medium ${done ? 'text-green-700' : 'text-slate-400'}`}>{s.title}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Overall rating selector */}
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Overall Rating</p>
                    {RATINGS.map(r => {
                      const cfg = RATING_CONFIG[r]
                      const isSelected = rating === r
                      return (
                        <button key={r} onClick={() => setRating(r)}
                          className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-sm text-left transition-all ${isSelected ? cfg.colour + ' border-current' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                          {cfg.label}
                          {r === 'insufficient' && <span className="text-xs ml-2 opacity-70">(Revision Required)</span>}
                          {r === 'adequate'     && <span className="text-xs ml-2 opacity-70">(Pass)</span>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Overall comments */}
                  <div className="mb-6">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Overall Comments</label>
                    <textarea
                      className={`${inputClass} resize-none`}
                      rows={5}
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="Provide an overall assessment and any additional constructive feedback for the ordinand..."
                    />
                  </div>

                  {/* Draft saved indicator */}
                  {draftSavedAt && (
                    <p className="text-xs text-slate-400 font-medium text-center mb-3">
                      Draft saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {/* Save buttons */}
                  <div className="flex gap-2 mb-0">
                    <button
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft || isSaving}
                      className="flex-1 border-2 border-slate-300 text-slate-600 py-3 rounded-xl font-bold hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      {isSavingDraft ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      onClick={handleSaveGrade}
                      disabled={isSaving || isSavingDraft || !rating || !allRubricScored || !allPaperFeedback}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      {isSaving ? 'Saving...' : existingGrade ? 'Update Grade' : 'Save Grade'}
                    </button>
                  </div>

                  {isSermon && !allRubricScored && (
                    <p className="text-xs text-amber-600 font-bold text-center mt-3">Complete all {TOTAL_RUBRIC_CRITERIA} rubric criteria to save</p>
                  )}
                  {isPaper && isNewFormatSA && !allPaperFeedback && (
                    <p className="text-xs text-amber-600 font-bold text-center mt-3">Provide feedback for all 6 sections to save</p>
                  )}
                  {rating === 'insufficient' && <p className="text-xs text-red-600 font-bold text-center mt-3">This will mark the assignment as Revision Required</p>}
                  {rating && rating !== 'insufficient' && <p className="text-xs text-green-600 font-bold text-center mt-3">This will mark the assignment as Complete</p>}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  )
}
