// app/dashboard/ordinand/requirements/[id]/page.tsx
// Ordinand requirement view: self-assessment form (papers) + file upload + submission
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { SELF_ASSESSMENT_TOPICS } from '../../../../../utils/selfAssessmentQuestions'

type Status = 'not_started' | 'submitted' | 'under_review' | 'revision_required' | 'complete'

// ── Handbook instructions shown to the ordinand on each requirement ──────────

const BOOK_REPORT_REQUIREMENTS = [
  'Approximately two pages in length, single-spaced',
  'Summarize key ideas and themes from the book',
  'Reflect on how the material applies to your life and ministry',
  'Engage critically with the text in light of Alliance theology and values',
  'Note areas of agreement, challenge, or new insight',
  'Connect the content to your current ministry context',
]

const SERMON_REQUIREMENTS = [
  'Submit a full sermon manuscript — not just an outline or notes',
  'At the top of the document include: the date and occasion (e.g. Sunday service, youth group)',
  'Identify the theme of the sermon (e.g. Divine Healing, Christ-Centred Life and Ministry)',
  'Identify the specific question from the ordination requirements that this sermon addresses',
  'Demonstrate faithful exegesis of a biblical text',
  'Integrate theology and application to contemporary ministry contexts',
  'If you are in a primary teaching role, submit a recording from your weekly worship service',
]

const PAPER_INSTRUCTIONS: Record<string, { overview: string; questions: string[] }> = {
  christ_centred: {
    overview: 'Write a 10–12 page theological reflection paper. Address each of the following questions, reflecting on the implications for your own life and ministry context.',
    questions: [
      'What is the biblical basis for the centrality of Christ in Christian worship? Why do we give preference to Christ-centred rather than Father-centred or Spirit-centred?',
      'In what ways does the all-sufficiency of Jesus impact your life and ministry? How might you teach this to help others experience the all-sufficiency of Jesus for themselves?',
      'How do the elements of the Fourfold Gospel have a practical impact on the life and ministry of a Christian worker? How can we restore the life-changing impact of these historic tenets of the Alliance tradition in our ministries today?',
      'What might it look like for a Christ-centred believer to have an active and intentional discipleship to Jesus, including the making of other disciples? How does the life and ministry of Jesus as revealed in the Gospels inform the way you centre your own life around him?',
      'Why is hearing the voice of Jesus essential to living a Christ-centred life? How would you disciple someone to hear Jesus\' voice? What are the ways in which you would coach someone to listen for it?',
    ],
  },
  spirit_empowered: {
    overview: 'Write a 10–12 page theological reflection paper. Address each of the following questions, reflecting on the implications for your own life and ministry context.',
    questions: [
      'Part of the Fourfold Gospel is the proclamation that Jesus Christ is our Sanctifier. Explain the dynamic link between being Spirit-empowered and the sanctifying work of Christ. Why do we believe this, why does it matter, and what are the implications — for you personally, for the church, and in a post-Christian Canada?',
      'What does it mean to be filled with the Holy Spirit? What would be evidences that someone is "Spirit-filled"? How does one seek and experience the filling of the Holy Spirit?',
      'What kinds of spiritual practices might someone utilize to invite a deeper work of the Spirit? How have these helped you personally? How might you disciple others to cultivate greater Spirit-empowerment?',
      'Define the term cessationism and explain why the Alliance rejects it.',
    ],
  },
  mission_focused: {
    overview: 'Write a 10–12 page theological reflection paper. Address each of the following questions, reflecting on the implications for your own life and ministry context.',
    questions: [
      'Why is "Mission" important today? How does the fate of humanity motivate the Church to be engaged in mission?',
      'How would you articulate the "Mission of God" and what scriptures would you use to challenge all believers to participate, regardless of their vocation or where they live?',
      'Identify some key barriers of perception people have about believers being on "mission." How would you address these?',
      'Describe how your life is currently aligned with the mission of God and how you are intentionally seeking to live out a "missionary" mindset in your community outside the walls of the church. Reflect on your practice of prayer, time and energy, personal strategy, and financial habits.',
      'How is mission motivated by the return of Christ? What role did the return of Christ play in the formation of the Alliance\'s doctrine of mission, and what role does/should it play today?',
    ],
  },
  scripture: {
    overview: 'Write a 10–12 page theological reflection paper. Address each of the following questions, reflecting on the implications for your own life and ministry context.',
    questions: [
      'Why do we believe Scripture is authoritative, and what are the implications — for you personally, for the church, and in a post-Christian Canada?',
      'How did we get the Bible as we have it today? What role did the early church councils play in the development of a Christian understanding of canonicity? How does this support the validity of the scriptural claims?',
      'What is the basis for claiming the Bible as the authority for our lives?',
      'What are the range and limits of the terms inspiration, inerrancy, and infallibility? Why are these doctrines important in a post-modern culture where truth is often considered relative?',
    ],
  },
  divine_healing: {
    overview: 'Write a 10–12 page theological reflection paper. Address each of the following questions, reflecting on the implications for your own life and ministry context.',
    questions: [
      'What do the Scriptures teach about the availability of divine healing for today? To whom and to what does it apply? What might it look like in practice?',
      'How might we wisely steward this gift of grace with those we encounter?',
      'What do we mean when we say that Christ is our Healer? Describe the relationship between the provision for healing and the atonement.',
      'How would you counsel someone who has been prayed for and yet not received healing? How do you integrate a theology of suffering with a theology of healing?',
    ],
  },
}

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
      .select('id, file_url, self_assessment, submitted_at')
      .eq('ordinand_requirement_id', id)
      .order('submitted_at', { ascending: false })
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

  const isPaper   = requirement?.requirement_templates?.type === 'paper'
  const isSermon  = requirement?.requirement_templates?.type === 'sermon'
  const isBook    = requirement?.requirement_templates?.type === 'book_report'
  const topic     = requirement?.requirement_templates?.topic
  const topicData = topic ? SELF_ASSESSMENT_TOPICS[topic] : null
  const paperInstructions = isPaper && topic ? PAPER_INSTRUCTIONS[topic] : null
  const status: Status = requirement?.status ?? 'not_started'
  const statusCfg = STATUS_CONFIG[status]
  const isLocked = status === 'submitted' || status === 'under_review' || status === 'complete'
    const canEdit = !isLocked
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

  const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }
  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
  const btnPrimary = "bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-300 disabled:shadow-none"

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading requirement...
    </div>
  )
  if (!requirement) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Requirement not found.
    </div>
  )

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <Link href="/dashboard/ordinand" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← My Requirements</Link>
      </header>

    <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black mt-1" style={{ color: C.deepSea }}>{requirement.requirement_templates?.title}</h1>
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

        {/* ── What you need to produce ─────────────────────────────── */}
        {isBook && (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#0077C8' }}>Book Report Requirements</h2>
            <p className="text-xs text-slate-500 font-medium mb-5">Your report should be approximately two pages, single-spaced, and must cover each of the following:</p>
            <ul className="space-y-2">
              {BOOK_REPORT_REQUIREMENTS.map((req, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isSermon && (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#0077C8' }}>Sermon Submission Requirements</h2>
            <p className="text-xs text-slate-500 font-medium mb-5">Each sermon submission must meet all of the following requirements:</p>
            <ul className="space-y-2">
              {SERMON_REQUIREMENTS.map((req, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isPaper && paperInstructions && (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 mb-6">
            <h2 className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#0077C8' }}>Paper Requirements</h2>
            <p className="text-sm text-slate-600 font-medium mb-6">{paperInstructions.overview}</p>
            <div className="space-y-4">
              {paperInstructions.questions.map((q, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-white rounded-2xl border border-blue-100 px-5 py-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Reminder</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Papers should be 10–12 pages, formatted according to the CMD style guide. Writing in first-person is acceptable. Complete the self-assessment form below before submitting.</p>
            </div>
          </div>
        )}

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
            <p className="text-sm text-slate-600 font-medium mb-1 leading-relaxed">
              For each criterion below, rate how well your paper addresses it, then briefly describe <strong>where and how</strong> your paper engages with it — cite specific sections, arguments, or page numbers.
            </p>
            <p className="text-xs text-amber-600 font-bold mb-6">You are not being asked to answer these questions again — you are evaluating how well your submitted paper already addresses them.</p>
            <div className="space-y-8">
              {topicData.questions.map((q, i) => (
                <div key={q.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Criterion {i + 1}</p>
                  <p className="text-sm font-bold text-slate-800 mb-4 leading-relaxed">{q.question}</p>
                  <div className="mb-3">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">How well does your paper address this criterion?</label>
                    <select
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      value={selfAssessments[q.id] || ''}
                      onChange={e => setSelfAssessments(prev => ({ ...prev, [q.id]: e.target.value }))}
                      disabled={!canEdit}
                    >
                      <option value="">Select a rating…</option>
                      <option value="insufficient">Insufficient — not meaningfully addressed</option>
                      <option value="adequate">Adequate — addressed at a basic level</option>
                      <option value="good">Good — addressed clearly and substantively</option>
                      <option value="excellent">Excellent — addressed with depth and insight</option>
                      <option value="exceptional">Exceptional — addressed with exceptional depth, originality, or precision</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Where does your paper address this? (cite sections, arguments, or page numbers)</label>
                    <textarea
                      className={`${inputClass} resize-none ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      rows={3}
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="e.g. 'Pages 3–5 address this through my discussion of… In section 2 I argue that…'"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Council Grading Criteria</p>
              <div className="flex flex-wrap gap-2">
                {topicData.rubricItems.map(item => (
                  <span key={item} className="px-3 py-1 bg-white border border-blue-100 rounded-full text-xs font-bold text-slate-600">{item}</span>
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
    </div>
  )
}
