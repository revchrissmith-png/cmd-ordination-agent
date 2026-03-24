// app/dashboard/ordinand/requirements/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { logActivity } from '../../../../../utils/logActivity'
import { SELF_ASSESSMENT_TOPICS, PAPER_SECTIONS } from '../../../../../utils/selfAssessmentQuestions'
import { SERMON_RUBRIC_SECTIONS, sectionAverage } from '../../../../../utils/sermonRubric'

type Status = 'not_started' | 'submitted' | 'under_review' | 'revision_required' | 'complete'

// ── Rating helpers ─────────────────────────────────────────────────────────────

const RATING_NUM: Record<string, number> = { insufficient: 1, adequate: 2, good: 3, excellent: 4, exceptional: 5 }
const RATING_COLOUR: Record<string, string> = {
  insufficient: 'bg-red-100 text-red-700',
  adequate:     'bg-amber-100 text-amber-700',
  good:         'bg-blue-100 text-blue-700',
  excellent:    'bg-green-100 text-green-700',
  exceptional:  'bg-purple-100 text-purple-700',
}

function avgRatingLabel(ratings: Record<string, string>): { label: string; colour: string } | null {
  const vals = Object.values(ratings).map(r => RATING_NUM[r] || 0).filter(v => v > 0)
  if (!vals.length) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  let label = 'Insufficient'
  if (avg >= 4.5) label = 'Exceptional'
  else if (avg >= 3.5) label = 'Excellent'
  else if (avg >= 2.5) label = 'Good'
  else if (avg >= 1.5) label = 'Adequate'
  return { label, colour: RATING_COLOUR[label.toLowerCase()] || 'bg-slate-100 text-slate-500' }
}

function singleRatingDisplay(r: string): { label: string; colour: string } | null {
  if (!r) return null
  return { label: r.charAt(0).toUpperCase() + r.slice(1), colour: RATING_COLOUR[r] || 'bg-slate-100 text-slate-500' }
}

// ── Book options per category ─────────────────────────────────────────────────

const BOOK_OPTIONS: Record<string, string[]> = {
  history: [
    'All For Jesus — Robert L. Niklaus',
    'A.B. Simpson and the Making of Modern Evangelicalism — Daryn Henry',
  ],
  theology: [
    'Abide and Go: Missional Theosis in the Gospel of John — Michael J. Gorman',
    'Rethinking Holiness: A Theological Introduction — Bernie Van De Walle',
    'Surprised by Hope: Rethinking Heaven, the Resurrection, and the Mission of the Church — N.T. Wright',
  ],
  deeper_life: [
    'Strengthening the Soul of Your Leadership — Ruth Haley Barton',
    'Hearing God: Developing a Conversational Relationship With God — Dallas Willard',
  ],
  missions: [
    'Completion of the Kairos Course',
    'Short-term mission trip with the Alliance Canada + On Mission: Why We Go — Ronald Brown',
    "The Mission of God's People: A Biblical Theology of the Church's Mission — Christopher J.H. Wright",
  ],
  holy_scripture: [
    'God Has Spoken — J.I. Packer',
    'The Blue Parakeet: Rethinking How You Read The Bible — Scot McKnight',
  ],
  anthropology: [
    'Strange New World: How Thinkers and Activists Redefined Identity and Sparked the Sexual Revolution — Carl R. Trueman',
    'The Genesis of Gender — Abigail Favale',
    'Love Thy Body — Nancy Pearcy',
  ],
  disciple_making: [
    "The Great Omission: Reclaiming Jesus' Essential Teachings on Discipleship — Dallas Willard",
  ],
  specific_ministry_focus: [], // free text — ordinand enters their own book
}

// ── Handbook instructions ─────────────────────────────────────────────────────

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
  'If you are in a primary teaching role, paste a link to your sermon recording in the field below',
]

const PAPER_INSTRUCTIONS: Record<string, { overview: string; questions: string[] }> = {
  christ_centred: {
    overview: 'Write a 10–12 page theological reflection paper. Address each of the following questions, reflecting on the implications for your own life and ministry context.',
    questions: [
      'What is the biblical basis for the centrality of Christ in Christian worship? Why do we give preference to Christ-centred rather than Father-centred or Spirit-centred?',
      'In what ways does the all-sufficiency of Jesus impact your life and ministry? How might you teach this to help others experience the all-sufficiency of Jesus for themselves?',
      'How do the elements of the Fourfold Gospel have a practical impact on the life and ministry of a Christian worker? How can we restore the life-changing impact of these historic tenets of the Alliance tradition in our ministries today?',
      'What might it look like for a Christ-centred believer to have an active and intentional discipleship to Jesus, including the making of other disciples? How does the life and ministry of Jesus as revealed in the Gospels inform the way you centre your own life around him?',
      "Why is hearing the voice of Jesus essential to living a Christ-centred life? How would you disciple someone to hear Jesus' voice? What are the ways in which you would coach someone to listen for it?",
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
      "How is mission motivated by the return of Christ? What role did the return of Christ play in the formation of the Alliance's doctrine of mission, and what role does/should it play today?",
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

const RATING_OPTIONS = [
  { value: 'insufficient', label: 'Insufficient — not meaningfully addressed' },
  { value: 'adequate',     label: 'Adequate — addressed at a basic level' },
  { value: 'good',         label: 'Good — addressed clearly and substantively' },
  { value: 'excellent',    label: 'Excellent — addressed with depth and insight' },
  { value: 'exceptional',  label: 'Exceptional — addressed with exceptional depth, originality, or precision' },
]

export default function OrdinandRequirementPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [requirement, setRequirement]   = useState<any>(null)
  const [submission, setSubmission]     = useState<any>(null)
  const [grade, setGrade]               = useState<any>(null)
  const [loading, setLoading]           = useState(true)
  const [message, setMessage]           = useState({ text: '', type: '' })
  const [file, setFile]                 = useState<File | null>(null)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [selectedBook, setSelectedBook] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Self-assessment state (new v2 format) ──────────────────────────────────
  // Completeness section: per-question rating + one shared evidence field
  const [questionRatings,      setQuestionRatings]      = useState<Record<string, string>>({})
  const [completenessEvidence, setCompletenessEvidence] = useState('')
  // Sections 2-6: single rating + evidence per section
  const [sectionRatings,  setSectionRatings]  = useState<Record<string, string>>({})
  const [sectionEvidence, setSectionEvidence] = useState<Record<string, string>>({})

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 6000)
  }

  async function fetchData() {
    setLoading(true)
    const { data: req } = await supabase
      .from('ordinand_requirements')
      .select(`id, status, updated_at, ordinand_id, requirement_templates(id, type, topic, book_category, title, description, sermon_question_index), cohorts(sermon_topic)`)
      .eq('id', id)
      .single()
    setRequirement(req)
    if (req) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) logActivity(user.id, 'requirement_view', `/dashboard/ordinand/requirements/${id}`, {
        title: (req.requirement_templates as any)?.title,
        type: (req.requirement_templates as any)?.type,
        status: req.status,
      })
    }

    const { data: sub } = await supabase
      .from('submissions')
      .select('id, file_url, file_name, notes, selected_book, self_assessment, submitted_at')
      .eq('ordinand_requirement_id', id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (sub) {
      setSubmission(sub)
      if (sub.notes) setRecordingUrl(sub.notes)
      if (sub.selected_book) setSelectedBook(sub.selected_book)

      // Load self-assessment — v2 format only
      if (sub.self_assessment?.version === 2 && sub.self_assessment?.sections) {
        const s = sub.self_assessment.sections
        if (s.completeness) {
          setQuestionRatings(s.completeness.question_ratings || {})
          setCompletenessEvidence(s.completeness.evidence || '')
        }
        const otherSectionIds = ['theological_depth', 'scripture', 'personal_reflection', 'sources', 'grammar']
        const ratings: Record<string, string> = {}
        const evidence: Record<string, string> = {}
        otherSectionIds.forEach(sid => {
          if (s[sid]) {
            ratings[sid]  = s[sid].rating  || ''
            evidence[sid] = s[sid].evidence || ''
          }
        })
        setSectionRatings(ratings)
        setSectionEvidence(evidence)
      }

      const { data: g } = await supabase
        .from('grades')
        .select('id, overall_rating, overall_comments, graded_at, sermon_rubric, paper_assessment')
        .eq('submission_id', sub.id)
        .single()
      setGrade(g)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const isPaper      = requirement?.requirement_templates?.type === 'paper'
  const isSermon     = requirement?.requirement_templates?.type === 'sermon'
  const isBook       = requirement?.requirement_templates?.type === 'book_report'
  const topic        = requirement?.requirement_templates?.topic
  const bookCategory = requirement?.requirement_templates?.book_category ?? ''
  const bookOptions  = BOOK_OPTIONS[bookCategory] ?? []
  const isRequiredBook = bookOptions.length === 1
  const isFreeTextBook = bookCategory === 'specific_ministry_focus'
  const topicData    = topic ? SELF_ASSESSMENT_TOPICS[topic] : null
  const paperInstructions = isPaper && topic ? PAPER_INSTRUCTIONS[topic] : null
  const status: Status = requirement?.status ?? 'not_started'
  const statusCfg = STATUS_CONFIG[status]
  const isLocked  = status === 'submitted' || status === 'under_review' || status === 'complete'
  const canEdit   = !isLocked

  const isNewFormatSA = submission?.self_assessment?.version === 2

  // All self-assessment fields filled for new format
  const allAnswered = topicData ? (
    topicData.questions.every(q => (questionRatings[q.id] || '').trim()) &&
    completenessEvidence.trim().length > 0 &&
    PAPER_SECTIONS.filter(s => s.id !== 'completeness').every(s =>
      (sectionRatings[s.id] || '').trim() && (sectionEvidence[s.id] || '').trim()
    )
  ) : true

  async function handleSubmit() {
    if (!requirement) return
    if (isPaper && !allAnswered) { flash('Please complete all self-assessment sections before submitting.', 'error'); return }
    if (isBook && !isFreeTextBook && !isRequiredBook && !selectedBook) { flash('Please select the book you read before submitting.', 'error'); return }
    if (isBook && isFreeTextBook && !selectedBook.trim()) { flash('Please enter the title of your book before submitting.', 'error'); return }
    if (!file && !submission?.file_url) { flash('Please upload your manuscript file before submitting.', 'error'); return }
    setIsSubmitting(true)
    try {
      let fileUrl = submission?.file_url ?? ''
      if (file) {
        const ext = file.name.split('.').pop()
        const filePath = `${requirement.ordinand_id}/${id}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('submissions').upload(filePath, file, { upsert: true })
        if (uploadError) { flash('File upload failed: ' + uploadError.message, 'error'); setIsSubmitting(false); return }
        const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(filePath)
        fileUrl = urlData.publicUrl
      }

      // Build self-assessment payload (v2 format)
      let selfAssessmentPayload: Record<string, any> | null = null
      if (isPaper && topicData) {
        const sectionData: Record<string, any> = {
          completeness: {
            question_ratings: questionRatings,
            evidence: completenessEvidence,
          },
        }
        PAPER_SECTIONS.filter(s => s.id !== 'completeness').forEach(s => {
          sectionData[s.id] = {
            rating:   sectionRatings[s.id]  || '',
            evidence: sectionEvidence[s.id] || '',
          }
        })
        selfAssessmentPayload = {
          version: 2,
          topic,
          sections: sectionData,
          submitted_at: new Date().toISOString(),
        }
      }

      const fileName    = file ? file.name : (submission?.file_name ?? 'submission')
      const notesPayload = isSermon ? (recordingUrl.trim() || null) : null
      const bookPayload  = isBook ? (isRequiredBook ? bookOptions[0] : selectedBook.trim() || null) : null

      let saveError: any = null
      if (submission) {
        const { error } = await supabase.from('submissions').update({
          file_url: fileUrl, file_name: fileName, notes: notesPayload,
          selected_book: bookPayload, self_assessment: selfAssessmentPayload,
        }).eq('id', submission.id)
        saveError = error
      } else {
        const { error } = await supabase.from('submissions').insert({
          ordinand_requirement_id: id, ordinand_id: requirement.ordinand_id,
          file_url: fileUrl, file_name: fileName, notes: notesPayload,
          selected_book: bookPayload, self_assessment: selfAssessmentPayload,
        })
        saveError = error
      }
      if (saveError) { flash('Error saving submission: ' + saveError.message, 'error'); setIsSubmitting(false); return }

      const { error: statusError } = await supabase.from('ordinand_requirements').update({ status: 'submitted' }).eq('id', id)
      if (statusError) { flash('Submission saved but status update failed: ' + statusError.message, 'error'); setIsSubmitting(false); return }

      flash('Submitted successfully!', 'success')

      // Notify the grader — always fires, independent of auth state
      fetch('/api/notify-grader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId: id }),
      }).then(r => r.json()).then(r => console.log('[notify-grader]', r)).catch(e => console.error('[notify-grader error]', e))

      // Log activity if user is available (non-critical)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) logActivity(user.id, 'submission', `/dashboard/ordinand/requirements/${id}`, {
          title: requirement?.requirement_templates?.title,
          type: requirement?.requirement_templates?.type,
        })
      })

      fetchData()
    } catch (err: any) {
      flash('Unexpected error: ' + err.message, 'error')
    }
    setIsSubmitting(false)
  }

  const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }
  const inputClass    = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
  const selectClass   = (disabled: boolean) => `w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`
  const textareaClass = (disabled: boolean) => `${inputClass} resize-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`
  const btnPrimary    = "bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-300 disabled:shadow-none"

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

  // ── Paper grade sections display (for ordinand after grading) ────────────────
  const hasSectionFeedback = grade?.paper_assessment?.sections

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </a>
        <Link href="/dashboard/ordinand" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← My Requirements</Link>
      </header>

      <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-3xl mx-auto">

          {/* Title + status */}
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

          {/* ── Requirement instructions ───────────────────────────────────── */}

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
            <div className="space-y-4 mb-6">
              <div className="bg-blue-600 rounded-3xl p-8">
                <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-2">Question This Sermon Addresses</p>
                <p className="text-white font-bold text-lg leading-relaxed">{requirement.requirement_templates?.description}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8">
                <h2 className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#0077C8' }}>Sermon Submission Requirements</h2>
                <p className="text-xs text-slate-500 font-medium mb-5">Your manuscript must meet all of the following:</p>
                <ul className="space-y-2">
                  {SERMON_REQUIREMENTS.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
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

          {/* ── Council feedback (shown when graded) ─────────────────────────── */}

          {grade && isPaper && hasSectionFeedback && (
            <div className="bg-green-50 border border-green-200 rounded-3xl p-8 mb-6">
              <h2 className="text-xs font-black text-green-600 uppercase tracking-widest mb-5">Council Assessment</h2>
              <div className="space-y-4">
                {PAPER_SECTIONS.map((section, idx) => {
                  const councilComment = grade.paper_assessment.sections?.[section.id] || ''
                  let display: { label: string; colour: string } | null = null
                  if (section.id === 'completeness' && isNewFormatSA) {
                    display = avgRatingLabel(questionRatings)
                  } else if (isNewFormatSA && sectionRatings[section.id]) {
                    display = singleRatingDisplay(sectionRatings[section.id])
                  }
                  return (
                    <div key={section.id} className="bg-white rounded-2xl border border-green-100 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-200 text-green-700 font-black text-xs flex items-center justify-center">{idx + 1}</span>
                          <h3 className="text-sm font-black text-green-800">{section.title}</h3>
                        </div>
                        {display && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${display.colour}`}>{display.label}</span>
                        )}
                      </div>
                      {councilComment ? (
                        <p className="text-sm text-green-900 font-medium leading-relaxed">{councilComment}</p>
                      ) : (
                        <p className="text-xs text-green-600 italic">No section feedback provided.</p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 pt-5 border-t border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-black text-green-800 capitalize">{grade.overall_rating}</span>
                  <span className="text-xs text-green-600 font-medium">— graded {new Date(grade.graded_at).toLocaleDateString()}</span>
                </div>
                {grade.overall_comments && <p className="text-sm text-green-900 font-medium leading-relaxed">{grade.overall_comments}</p>}
              </div>
            </div>
          )}

          {grade && isPaper && !hasSectionFeedback && (
            <div className="bg-green-50 border border-green-200 rounded-3xl p-8 mb-6">
              <h2 className="text-xs font-black text-green-600 uppercase tracking-widest mb-4">Council Feedback</h2>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-black text-green-800 capitalize">{grade.overall_rating}</span>
                <span className="text-xs text-green-600 font-medium">— graded {new Date(grade.graded_at).toLocaleDateString()}</span>
              </div>
              {grade.overall_comments && <p className="text-sm text-green-900 font-medium leading-relaxed">{grade.overall_comments}</p>}
            </div>
          )}

          {grade && !isPaper && (
            <div className="bg-green-50 border border-green-200 rounded-3xl p-8 mb-6">
              <h2 className="text-xs font-black text-green-600 uppercase tracking-widest mb-4">Council Feedback</h2>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-black text-green-800 capitalize">{grade.overall_rating}</span>
                <span className="text-xs text-green-600 font-medium">— graded {new Date(grade.graded_at).toLocaleDateString()}</span>
              </div>
              {grade.overall_comments && <p className="text-sm text-green-900 font-medium leading-relaxed">{grade.overall_comments}</p>}
              {isSermon && grade.sermon_rubric && (
                <div className="mt-5 pt-5 border-t border-green-200">
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-3">Rubric Section Scores</p>
                  <div className="space-y-2.5">
                    {SERMON_RUBRIC_SECTIONS.map(section => {
                      const avg = sectionAverage(section.id, grade.sermon_rubric)
                      if (avg === null) return null
                      const pct = (avg / 4) * 100
                      const sectionName = section.title.replace(/^[IVX]+\.\s+/, '')
                      const barColour = avg >= 3.5 ? 'bg-purple-500' : avg >= 2.75 ? 'bg-green-500' : avg >= 2.25 ? 'bg-blue-500' : avg >= 1.75 ? 'bg-amber-500' : 'bg-red-500'
                      return (
                        <div key={section.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-green-900 w-32 shrink-0">{sectionName}</span>
                          <div className="flex-1 bg-green-100 rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${barColour}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-green-700 shrink-0 w-10 text-right">{avg.toFixed(1)} / 4</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'revision_required' && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-6 mb-6">
              <p className="text-sm font-bold text-red-700">⚠ This assignment requires revision. Please review the feedback above, make corrections, and resubmit.</p>
            </div>
          )}

          {/* ── Paper self-assessment (6 sections) ───────────────────────────── */}

          {isPaper && topicData && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Self-Assessment</h2>
              <p className="text-sm text-slate-600 font-medium mb-1 leading-relaxed">
                For each section below, rate how well your paper addresses the criterion, then briefly describe <strong>where and how</strong> your paper engages with it — cite specific sections, arguments, or page numbers.
              </p>
              <p className="text-xs text-amber-600 font-bold mb-6">You are evaluating how well your submitted paper addresses each criterion — not answering the questions again.</p>

              <div className="space-y-8">

                {/* Section 1: Completeness — per-question rating */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">1</span>
                    <h3 className="text-sm font-black text-slate-800">Completeness</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mb-5 ml-10">Have you addressed each of the key questions as outlined in the assignment guide?</p>

                  <div className="space-y-3 mb-5">
                    {topicData.questions.map((q, i) => (
                      <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Question {i + 1}</p>
                        <p className="text-sm font-bold text-slate-700 mb-3 leading-relaxed">{q.question}</p>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">How well does your paper address this question?</label>
                        <select
                          className={selectClass(!canEdit)}
                          value={questionRatings[q.id] || ''}
                          onChange={e => setQuestionRatings(prev => ({ ...prev, [q.id]: e.target.value }))}
                          disabled={!canEdit}
                        >
                          <option value="">Select a rating…</option>
                          {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Point to features or evidence from your work to substantiate your assessment</label>
                    <textarea
                      className={textareaClass(!canEdit)}
                      rows={4}
                      value={completenessEvidence}
                      onChange={e => setCompletenessEvidence(e.target.value)}
                      placeholder="e.g. All five questions are addressed. Pages 3–5 cover question 1 through my discussion of… Section 3 addresses question 3 by…"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {/* Sections 2–6 */}
                {PAPER_SECTIONS.filter(s => s.id !== 'completeness').map((section, idx) => (
                  <div key={section.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">{idx + 2}</span>
                      <h3 className="text-sm font-black text-slate-800">{section.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-5 ml-10 leading-relaxed">{section.prompt}</p>

                    {section.note && (
                      <div className="ml-10 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">{section.note}</p>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="mb-3">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Self-Assessment Rating</label>
                        <select
                          className={selectClass(!canEdit)}
                          value={sectionRatings[section.id] || ''}
                          onChange={e => setSectionRatings(prev => ({ ...prev, [section.id]: e.target.value }))}
                          disabled={!canEdit}
                        >
                          <option value="">Select a rating…</option>
                          {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Point to evidence from your paper</label>
                        <textarea
                          className={textareaClass(!canEdit)}
                          rows={3}
                          value={sectionEvidence[section.id] || ''}
                          onChange={e => setSectionEvidence(prev => ({ ...prev, [section.id]: e.target.value }))}
                          placeholder="e.g. In section 3 I engage with three scholarly sources on this point…"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          )}

          {/* ── Book selection ────────────────────────────────────────────────── */}

          {isBook && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Book Selection</h2>
              <p className="text-xs text-slate-400 font-medium mb-4">
                {isFreeTextBook ? 'Enter the title and author of the book you chose for this category.' : isRequiredBook ? 'This category has one required title.' : 'Select the book you read from the approved list below.'}
              </p>
              {submission?.selected_book && !canEdit && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-green-600 font-bold text-sm">✓ Book recorded:</span>
                  <span className="text-slate-700 font-bold text-sm">{submission.selected_book}</span>
                </div>
              )}
              {canEdit && isRequiredBook && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <span className="text-blue-600 font-bold text-sm">📖 Required:</span>
                  <span className="text-slate-700 font-bold text-sm">{bookOptions[0]}</span>
                </div>
              )}
              {canEdit && !isRequiredBook && !isFreeTextBook && (
                <select className={inputClass} value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
                  <option value="">Select a book…</option>
                  {bookOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
              {canEdit && isFreeTextBook && (
                <input
                  type="text"
                  className={inputClass}
                  value={selectedBook}
                  onChange={e => setSelectedBook(e.target.value)}
                  placeholder="e.g. The Emotionally Healthy Church — Peter Scazzero"
                />
              )}
            </div>
          )}

          {/* ── File upload ───────────────────────────────────────────────────── */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">
              {isPaper ? 'Upload Your Paper' : isSermon ? 'Upload Your Sermon Manuscript' : 'Upload Your Assignment'}
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-5">Accepted formats: PDF, DOCX, DOC. Maximum file size: 20MB.</p>
            {submission?.file_url && (
              <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span className="text-green-600 font-bold text-sm">✓ Manuscript submitted</span>
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

            {/* Recording link — sermons only */}
            {isSermon && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Sermon Recording Link</label>
                <p className="text-xs text-slate-400 font-medium mb-3">
                  If you are in a primary teaching role, paste a link to your sermon recording below (YouTube, Vimeo, church website, etc.). This is optional for those not in a primary teaching role.
                </p>
                {submission?.notes && !canEdit && (
                  <div className="mb-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <span className="text-green-600 font-bold text-sm">✓ Recording linked</span>
                    <a href={submission.notes} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold text-xs underline truncate">{submission.notes}</a>
                  </div>
                )}
                {canEdit && (
                  <input
                    type="url"
                    className={inputClass}
                    value={recordingUrl}
                    onChange={e => setRecordingUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                )}
              </div>
            )}
          </div>

          {/* ── Submit button ─────────────────────────────────────────────────── */}

          {canEdit && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (isPaper && !allAnswered) || (!file && !submission?.file_url)}
                className={btnPrimary}
              >
                {isSubmitting ? 'Submitting...' : status === 'revision_required' ? 'Resubmit' : 'Submit'}
              </button>
              {isPaper && !allAnswered && (
                <p className="text-xs text-amber-600 font-bold">Please complete all self-assessment sections to submit</p>
              )}
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
