// app/dashboard/council/grade/[assignmentId]/page.tsx
// Council member grading view for theological papers
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { SELF_ASSESSMENT_TOPICS } from '../../../../../utils/selfAssessmentQuestions'

const RATINGS = ['insufficient', 'adequate', 'good', 'excellent', 'exceptional'] as const
type Rating = typeof RATINGS[number]

const RATING_CONFIG: Record<Rating, { colour: string; label: string }> = {
  insufficient: { colour: 'border-red-400 bg-red-50 text-red-700',         label: 'Insufficient' },
  adequate:     { colour: 'border-amber-400 bg-amber-50 text-amber-700',    label: 'Adequate' },
  good:         { colour: 'border-blue-400 bg-blue-50 text-blue-700',       label: 'Good' },
  excellent:    { colour: 'border-green-400 bg-green-50 text-green-700',    label: 'Excellent' },
  exceptional:  { colour: 'border-purple-400 bg-purple-50 text-purple-700', label: 'Exceptional' },
}

const SELF_ASSESSMENT_COLOUR: Record<string, string> = {
  insufficient: 'bg-red-100 text-red-700',
  adequate:     'bg-amber-100 text-amber-700',
  good:         'bg-blue-100 text-blue-700',
  excellent:    'bg-green-100 text-green-700',
  exceptional:  'bg-purple-100 text-purple-700',
}

export default function CouncilPaperGradePage() {
    const params = useParams<{ assignmentId: string }>()
    const assignmentId = params?.assignmentId ?? ''
  const [assignment, setAssignment] = useState<any>(null)
  const [requirement, setRequirement] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [existingGrade, setExistingGrade] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [rating, setRating] = useState<Rating | ''>('')
  const [comments, setComments] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 6000)
  }

  async function fetchData() {
    setLoading(true)
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
        .select('id, overall_rating, overall_comments, graded_at')
        .eq('submission_id', sub.id)
        .single()
      if (g) { setExistingGrade(g); setRating(g.overall_rating); setComments(g.overall_comments || '') }
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [assignmentId])

  async function handleSaveGrade() {
    if (!rating) { flash('Please select a rating before saving.', 'error'); return }
    if (!submission) { flash('No submission found to grade.', 'error'); return }
    setIsSaving(true)
    try {
      if (existingGrade) {
        await supabase.from('grades').update({
          overall_rating: rating, overall_comments: comments, graded_at: new Date().toISOString(),
        }).eq('id', existingGrade.id)
      } else {
        await supabase.from('grades').insert({
          submission_id: submission.id, grading_assignment_id: assignment.id,
          overall_rating: rating, overall_comments: comments,
          graded_by: assignment.council_member_id, graded_at: new Date().toISOString(),
        })
      }
      const newStatus = rating === 'insufficient' ? 'revision_required' : 'complete'
      await supabase.from('ordinand_requirements').update({ status: newStatus }).eq('id', requirement.id)
      flash('Grade saved successfully.', 'success')
      fetchData()
    } catch (err: any) { flash('Error saving grade: ' + err.message, 'error') }
    setIsSaving(false)
  }

  const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }
  const isPaper  = requirement?.requirement_templates?.type === 'paper'
  const isSermon = requirement?.requirement_templates?.type === 'sermon'
  const isBook   = requirement?.requirement_templates?.type === 'book_report'
  const topic = requirement?.requirement_templates?.topic
  const topicData = topic ? SELF_ASSESSMENT_TOPICS[topic] : null
  const answers: Record<string, string> = submission?.self_assessment?.answers || {}
  const selfRatings: Record<string, string> = submission?.self_assessment?.self_assessments || {}
  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
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

            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">
                  {isBook ? 'Submitted Book Report' : isSermon ? 'Submitted Sermon' : 'Submitted Paper'}
                </h2>
                {/* Book selected */}
                {isBook && submission.selected_book && (
                  <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Book:</span>
                    <span className="text-sm font-bold text-slate-800">{submission.selected_book}</span>
                  </div>
                )}
                {/* Sermon recording link */}
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
                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold text-sm underline">Open file →</a>
                  </div>
                </div>
              </div>

              {isPaper && topicData ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                  <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Self-Assessment Responses</h2>
                  <p className="text-xs text-slate-400 font-medium mb-6">{topicData.title} — submitted by ordinand</p>
                  <div className="space-y-6">
                    {topicData.questions.map((q, i) => {
                      const answer = answers[q.id] || ''
                      const selfRating = selfRatings[q.id] || ''
                      const isActive = activeQuestion === q.id
                      return (
                        <div key={q.id}
                          className={`border rounded-2xl p-5 cursor-pointer transition-all ${isActive ? 'border-blue-300 bg-blue-50/40 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                          onClick={() => setActiveQuestion(isActive ? null : q.id)}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-bold text-slate-800 leading-relaxed flex-1">
                              <span className="text-blue-500 font-black mr-2">{i + 1}.</span>{q.question}
                            </p>
                            {selfRating && (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 capitalize ${SELF_ASSESSMENT_COLOUR[selfRating] || 'bg-slate-100 text-slate-500'}`}>{selfRating}</span>
                            )}
                          </div>
                          {answer ? (
                            <p className={`text-sm text-slate-700 leading-relaxed font-medium transition-all ${isActive ? '' : 'line-clamp-3'}`}>{answer}</p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No response provided.</p>
                          )}
                          {!isActive && answer.length > 200 && <p className="text-xs text-blue-500 font-bold mt-1">Click to read more</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                  <p className="text-slate-400 font-medium text-sm">No self-assessment form for this assignment type.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sticky top-6">
                <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Grade</h2>
                <p className="text-xs text-slate-400 font-medium mb-6">{existingGrade ? `Last graded ${new Date(existingGrade.graded_at).toLocaleDateString()}` : 'Not yet graded'}</p>

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
                        {r === 'adequate' && <span className="text-xs ml-2 opacity-70">(Pass)</span>}
                      </button>
                    )
                  })}
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Feedback Comments</label>
                  <textarea className={`${inputClass} resize-none`} rows={6} value={comments} onChange={e => setComments(e.target.value)} placeholder="Provide constructive feedback for the ordinand..." />
                </div>

                {topicData && (
                  <div className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rubric</p>
                    <div className="space-y-1">
                      {topicData.rubricItems.map(item => <p key={item} className="text-xs text-slate-500 font-medium">· {item}</p>)}
                    </div>
                  </div>
                )}

                <button onClick={handleSaveGrade} disabled={isSaving || !rating}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
                  {isSaving ? 'Saving...' : existingGrade ? 'Update Grade' : 'Save Grade'}
                </button>
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
