// app/dashboard/ordinand/requirements/[id]/page.tsx
// Ordinand requirement view: self-assessment form (papers) + file upload + submission
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { SELF_ASSESSMENT_TOPICS } from '../../../../../utils/selfAssessmentQuestions'

type Status = 'not_started' | 'submitted' | 'under_review' | 'revision_required' | 'complete'

const STATUS_CONFIG: Record<Status, { label: string; colour: string }> = {
  not_started:       { label: 'Not Started',       colour: 'bg-slate-100 text-slate-500' },
  submitted:         { label: 'Submitted',          colour: 'bg-blue-100 text-blue-700' },
  under_review:      { label: 'Under Review',       colour: 'bg-amber-100 text-amber-700' },
  revision_required: { label: 'Revision Required',  colour: 'bg-red-100 text-red-700' },
  complete:          { label: 'Complete',            colour: 'bg-green-100 text-green-700' },
}

export default function OrdinandRequirementPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [requirement, setRequirement] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [grade, setGrade] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selfAssessments, setSelfAssessments] = useState<Record<string, string>>({})
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 6000)
  }

  async function fetchData() {
    setLoading(true)
    const { data: req } = await supabase
      .from('ordinand_requirements')
      .select(`id, status, updated_at, ordinand_id, requirement_templates(id, type, topic, title, description), cohorts(sermon_topic)`)
      .eq('id', id)
      .single()
    setRequirement(req)

    const { data: sub } = await supabase
      .from('submissions')
      .select('id, file_url, self_assessment, created_at')
      .eq('ordinand_requirement_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (sub) {
      setSubmission(sub)
      if (sub.self_assessment) {
        setAnswers(sub.self_assessment.answers || {})
        setSelfAssessments(sub.self_assessment.self_assessments || {})
      }
      const { data: g } = await supabase
        .from('grades')
        .select('id, overall_rating, overall_comments, graded_at')
        .eq('submission_id', sub.id)
        .single()
      setGrade(g)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const isPaper = requirement?.requirement_templates?.type === 'paper'
  const topic = requirement?.requirement_templates?.topic
  const topicData = topic ? SELF_ASSESSMENT_TOPICS[topic] : null
  const status: Status = requirement?.status ?? 'not_started'
  const statusCfg = STATUS_CONFIG[status]
  const isLocked = status === 'submitted' || status === 'under_review' || status === 'complete'
  const canEdit = !isLocked || status === 'revision_required'
  const allAnswered = topicData ? topicData.questions.every(q => (answers[q.id] || '').trim().length > 0) : true

  async function handleSubmit() {
    if (!requirement) return
    if (isPaper && !allAnswered) { flash('Please answer all self-assessment questions before submitting.', 'error'); return }
    if (!file && !submission?.file_url) { flash('Please upload your paper or assignment file before submitting.', 'error'); return }
    setIsSubmitting(true)
    try {
      let fileUrl = submission?.file_url ?? ''
      if (file) {
        const ext = file.name.split('.').pop()
        const filePath = `submissions/${requirement.ordinand_id}/${id}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('submissions').upload(filePath, file, { upsert: true })
        if (uploadError) { flash('File upload failed: ' + uploadError.message, 'error'); setIsSubmitting(false); return }
        const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(filePath)
        fileUrl = urlData.publicUrl
      }
      const selfAssessmentPayload = isPaper ? { answers, self_assessments: selfAssessments, topic, submitted_at: new Date().toISOString() } : null
      if (submission) {
        await supabase.from('submissions').update({ file_url: fileUrl, self_assessment: selfAssessmentPayload }).eq('id', submission.id)
      } else {
        await supabase.from('submissions').insert({ ordinand_requirement_id: id, ordinand_id: requirement.ordinand_id, file_url: fileUrl, self_assessment: selfAssessmentPayload })
      }
      await supabase.from('ordinand_requirements').update({ status: 'submitted' }).eq('id', id)
      flash('Submitted successfully!', 'success')
      fetchData()
    } catch (err: any) {
      flash('Unexpected error: ' + err.message, 'error')
    }
    setIsSubmitting(false)
  }

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
  const btnPrimary = "bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-300 disabled:shadow-none"

  if (loading) return <main className="min-h-screen bg-slate-50 p-10 flex items-center justify-center"><p className="text-slate-400 font-medium">Loading requirement...</p></main>
  if (!requirement) return <main className="min-h-screen bg-slate-50 p-10 flex items-center justify-center"><p className="text-slate-400 font-medium">Requirement not found.</p></main>

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-10">
          <div>
            <Link href="/dashboard" className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors">← Dashboard</Link>
            <h1 className="text-3xl font-black text-slate-900 mt-1">{requirement.requirement_templates?.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusCfg.colour}`}>{statusCfg.label}</span>
              {isPaper && <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700">Theological Paper</span>}
            </div>
          </div>
          {message.text && (
            <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </div>

        {grade && (
          <div className="bg-green-50 border border-green-200 rounded-3xl p-8 mb-6">
            <h2 className="text-xs font-black text-green-600 uppercase tracking-widest mb-4">Council Feedback</h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-black text-green-800 capitalize">{grade.overall_rating}</span>
              <span className="text-xs text-green-600 font-medium">— graded {new Date(grade.graded_at).toLocaleDateString()}</span>
            </div>
            {grade.overall_comments && <p className="text-sm text-green-900 font-medium leading-relaxed">{grade.overall_comments}</p>}
          </div>
        )}

        {status === 'revision_required' && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 mb-6">
            <p className="text-sm font-bold text-red-700">⚠ This assignment requires revision. Please review the feedback above, make corrections, and resubmit.</p>
          </div>
        )}

        {isPaper && topicData && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Self-Assessment</h2>
            <p className="text-xs text-slate-400 font-medium mb-6">Complete each question thoughtfully before submitting your paper.</p>
            <div className="space-y-8">
              {topicData.questions.map((q, i) => (
                <div key={q.id}>
                  <label className="block text-sm font-bold text-slate-800 mb-2 leading-relaxed">
                    <span className="text-blue-500 font-black mr-2">{i + 1}.</span>{q.question}
                  </label>
                  <textarea
                    className={`${inputClass} resize-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                    rows={5}
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Your response..."
                    disabled={!canEdit}
                  />
                  <div className="mt-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Self-Assessment</label>
                    <select
                      className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      value={selfAssessments[q.id] || ''}
                      onChange={e => setSelfAssessments(prev => ({ ...prev, [q.id]: e.target.value }))}
                      disabled={!canEdit}
                    >
                      <option value="">Rate your response...</option>
                      <option value="insufficient">Insufficient</option>
                      <option value="adequate">Adequate</option>
                      <option value="good">Good</option>
                      <option value="excellent">Excellent</option>
                      <option value="exceptional">Exceptional</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Assessment Rubric</p>
              <div className="flex flex-wrap gap-2">
                {topicData.rubricItems.map(item => (
                  <span key={item} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600">{item}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
          <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">{isPaper ? 'Upload Your Paper' : 'Upload Your Assignment'}</h2>
          <p className="text-xs text-slate-400 font-medium mb-5">Accepted formats: PDF, DOCX, DOC. Maximum file size: 20MB.</p>
          {submission?.file_url && (
            <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-green-600 font-bold text-sm">✓ File submitted</span>
              <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold text-xs underline">View file →</a>
            </div>
          )}
          {canEdit && (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-300 transition-colors">
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm font-bold text-slate-700">{file ? file.name : 'Click to choose a file'}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, DOCX, or DOC'}</p>
              </label>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (isPaper && !allAnswered) || (!file && !submission?.file_url)}
              className={btnPrimary}
            >
              {isSubmitting ? 'Submitting...' : status === 'revision_required' ? 'Resubmit' : 'Submit'}
            </button>
            {isPaper && !allAnswered && <p className="text-xs text-amber-600 font-bold">Please answer all {topicData?.questions.length} questions to submit</p>}
          </div>
        )}

        {!canEdit && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4">
            <p className="text-sm font-bold text-slate-500">
              {status === 'complete' ? '✓ This assignment is complete.' : '⏳ This assignment has been submitted and is awaiting review.'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
