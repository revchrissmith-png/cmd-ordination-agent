// app/dashboard/admin/_components/ArchiveReportModal.tsx
// Archive report modal — generates final report with completion summary, evaluations,
// mentor report, interview data, AI executive summary. Supports PDF, email, and DB persistence.
'use client'
import { useState, useRef } from 'react'
import { supabase } from '../../../../utils/supabase/client'
import { C, STATUS_CONFIG } from '../../../../lib/theme'
import ModalWrapper from '../../../components/ModalWrapper'
import {
  INTERVIEW_SECTIONS,
  INTERVIEW_RATING_LABELS,
  type InterviewRating,
} from '../../../../utils/interviewQuestions'

interface ArchiveReportModalProps {
  target: any // profile object
  mode: 'delete' | 'complete'
  councilMembers?: { id: string; first_name: string; last_name: string; email: string }[]
  onClose: () => void
  onArchive: () => void
  isArchiving: boolean
}

type Requirement = {
  id: string
  status: string
  template_id: string | null
  custom_title: string | null
  custom_type: string | null
  waived_reason: string | null
  requirement_templates: { title: string; type: string; display_order: number } | null
  submissions: { grades: { overall_rating: string; graded_at: string }[] }[] | null
}

const RESULT_LABELS: Record<string, string> = {
  sustained: 'Sustained', conditional: 'Conditionally Sustained',
  deferred: 'Deferred', not_sustained: 'Not Sustained',
}

const TYPE_LABELS: Record<string, string> = {
  book_report: 'Book Reports', paper: 'Theological Papers', sermon: 'Sermons',
}

export default function ArchiveReportModal({ target, mode, councilMembers = [], onClose, onArchive, isArchiving }: ArchiveReportModalProps) {
  const [step, setStep] = useState<'confirm' | 'report'>('confirm')
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  // Interview fields — auto-populated from oral_interviews
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewResult, setInterviewResult] = useState<string>('')
  const [interviewNotes, setInterviewNotes] = useState('')
  const [ordinationDate, setOrdinationDate] = useState('')
  const [officiant, setOfficiant] = useState('')
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [interviewFinalScores, setInterviewFinalScores] = useState<Record<string, string>>({})

  // Enriched data
  const [evaluationSummary, setEvaluationSummary] = useState('')
  const [mentorSummary, setMentorSummary] = useState('')

  // Actions state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [showEmailPanel, setShowEmailPanel] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState<Set<string>>(new Set())
  const [customEmail, setCustomEmail] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const summaryRef = useRef<HTMLDivElement>(null)

  // ── Data fetching ──────────────────────────────────────────────────

  async function fetchAllData() {
    setLoadingData(true)

    // Fetch requirements, interview, evaluations, and mentor reports in parallel
    const [reqsRes, ivRes, tokRes, mentorRes] = await Promise.all([
      supabase
        .from('ordinand_requirements')
        .select('id, status, template_id, custom_title, custom_type, waived_reason, requirement_templates(title, type, display_order), submissions(grades(overall_rating, graded_at))')
        .eq('ordinand_id', target.id)
        .order('requirement_templates(display_order)', { ascending: true } as any),
      supabase
        .from('oral_interviews')
        .select('id, interview_date, scheduled_date, result, notes, decision_notes, ordination_date, officiant, final_scores')
        .eq('ordinand_id', target.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('evaluation_tokens')
        .select('id, eval_type, evaluator_name, status, submitted_at')
        .eq('ordinand_id', target.id)
        .eq('status', 'submitted'),
      supabase
        .from('mentor_reports')
        .select('month, is_draft, submitted_at')
        .eq('ordinand_id', target.id)
        .eq('is_draft', false)
        .order('month', { ascending: false }),
    ])

    setRequirements((reqsRes.data as any[]) || [])

    // Interview data
    if (ivRes.data) {
      const iv = ivRes.data
      setInterviewId(iv.id)
      setInterviewDate(iv.interview_date || iv.scheduled_date || '')
      setInterviewResult(iv.result || '')
      setInterviewNotes([iv.notes, iv.decision_notes].filter(Boolean).join('\n\n') || '')
      setOrdinationDate(iv.ordination_date || '')
      setOfficiant(iv.officiant || '')
      setInterviewFinalScores(iv.final_scores || {})
    }

    // Evaluation summary
    const evals = tokRes.data || []
    if (evals.length > 0) {
      // Fetch actual evaluation data for submitted tokens
      const tokenIds = evals.map(t => t.id)
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('token_id, evaluator_name, q2_strengths, q3_development, q8_recommendation')
        .in('token_id', tokenIds)

      let evalText = ''
      for (const tok of evals) {
        const ev = evalData?.find(e => e.token_id === tok.id)
        const typeLabel = tok.eval_type === 'mentor' ? 'Mentor Evaluation' : 'Church Board Evaluation'
        evalText += `${typeLabel} — ${tok.evaluator_name}\n`
        evalText += `  Submitted: ${tok.submitted_at ? new Date(tok.submitted_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}\n`
        if (ev) {
          if (ev.q2_strengths) evalText += `  Strengths: ${ev.q2_strengths.slice(0, 200)}${ev.q2_strengths.length > 200 ? '…' : ''}\n`
          if (ev.q3_development) evalText += `  Growth areas: ${ev.q3_development.slice(0, 200)}${ev.q3_development.length > 200 ? '…' : ''}\n`
          if (ev.q8_recommendation !== null) evalText += `  Recommends ordination: ${ev.q8_recommendation ? 'Yes' : 'No'}\n`
        }
        evalText += '\n'
      }
      setEvaluationSummary(evalText.trim())
    }

    // Mentor report summary
    const reports = mentorRes.data || []
    if (reports.length > 0) {
      setMentorSummary(`${reports.length} mentor report${reports.length > 1 ? 's' : ''} submitted.\nMost recent: ${reports[0].month}${reports[0].submitted_at ? ` (submitted ${new Date(reports[0].submitted_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })})` : ''}`)
    }

    setLoadingData(false)
  }

  function handleGenerateReport() {
    setStep('report')
    fetchAllData()
  }

  // ── AI summary ─────────────────────────────────────────────────────

  async function handleGenerateAI() {
    setIsGeneratingAI(true)
    setAiSummary('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAiSummary('Session expired — please refresh.'); setIsGeneratingAI(false); return }
    try {
      const res = await fetch('/api/admin/interview-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ordinandId: target.id }),
      })
      if (!res.ok || !res.body) { setAiSummary('Error generating summary.'); setIsGeneratingAI(false); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setAiSummary(prev => prev + decoder.decode(value, { stream: true }))
      }
    } catch {
      setAiSummary('Error generating summary — please try again.')
    }
    setIsGeneratingAI(false)
  }

  // ── Helpers ────────────────────────────────────────────────────────

  const activeRequirements = requirements.filter(r => r.status !== 'waived')
  const waivedRequirements = requirements.filter(r => r.status === 'waived')
  const grouped = activeRequirements.reduce<Record<string, Requirement[]>>((acc, req) => {
    const type = req.requirement_templates?.type ?? req.custom_type ?? 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(req)
    return acc
  }, {})

  const totalCompleted = activeRequirements.filter(r => r.status === 'complete' || r.status === 'graded').length
  const total = activeRequirements.length

  const reqTitle = (r: Requirement) => r.requirement_templates?.title ?? r.custom_title ?? 'Unknown'

  function getGrade(req: Requirement): string {
    const subs = Array.isArray(req.submissions) ? req.submissions : []
    for (const sub of subs) {
      const grades = Array.isArray(sub.grades) ? sub.grades : []
      if (grades.length > 0 && grades[0].overall_rating) return grades[0].overall_rating
    }
    return '—'
  }

  // ── Build full report text ─────────────────────────────────────────

  function buildReportText(): string {
    let text = `ARCHIVE REPORT\n${target.first_name} ${target.last_name}\nGenerated: ${new Date().toLocaleDateString('en-CA')}\n\n`

    // Completion summary
    text += `COMPLETION SUMMARY: ${totalCompleted} of ${total} requirements completed\n`
    text += '─'.repeat(60) + '\n\n'
    for (const [type, reqs] of Object.entries(grouped)) {
      text += `${(TYPE_LABELS[type] || type).toUpperCase()}\n`
      for (const req of reqs) {
        const title = reqTitle(req)
        const status = req.status
        const grade = getGrade(req)
        const customTag = req.template_id === null ? ' [custom]' : ''
        text += `  ${status === 'complete' || status === 'graded' ? '✓' : '○'} ${title}${customTag} — ${status} ${grade !== '—' ? `(${grade})` : ''}\n`
      }
      text += '\n'
    }
    if (waivedRequirements.length > 0) {
      text += `WAIVED (${waivedRequirements.length})\n`
      for (const req of waivedRequirements) {
        const title = reqTitle(req)
        const reason = req.waived_reason ? ` — ${req.waived_reason}` : ''
        text += `  • ${title}${reason}\n`
      }
      text += '\n'
    }

    // Interview
    if (interviewDate || interviewResult || interviewNotes) {
      text += 'ORAL INTERVIEW\n'
      if (interviewDate) text += `  Date: ${interviewDate}\n`
      if (interviewResult) text += `  Result: ${RESULT_LABELS[interviewResult] || interviewResult}\n`
      // Final section grades
      const scoredSections = INTERVIEW_SECTIONS.filter(s => interviewFinalScores[s.id])
      if (scoredSections.length > 0) {
        text += '  Section Grades:\n'
        for (const s of scoredSections) {
          const grade = interviewFinalScores[s.id] as InterviewRating
          text += `    ${s.title}: ${INTERVIEW_RATING_LABELS[grade] || grade}\n`
        }
      }
      if (interviewNotes) text += `  Notes: ${interviewNotes}\n`
      text += '\n'
    }

    // Ordination
    if (ordinationDate || officiant) {
      text += 'ORDINATION SERVICE\n'
      if (ordinationDate) text += `  Date: ${ordinationDate}\n`
      if (officiant) text += `  Officiant: ${officiant}\n`
      text += '\n'
    }

    // Evaluations
    if (evaluationSummary) {
      text += 'EXTERNAL EVALUATIONS\n'
      text += evaluationSummary.split('\n').map(l => `  ${l}`).join('\n') + '\n\n'
    }

    // Mentor
    if (mentorSummary) {
      text += 'MENTOR REPORT\n'
      text += mentorSummary.split('\n').map(l => `  ${l}`).join('\n') + '\n\n'
    }

    // AI summary
    if (aiSummary) {
      text += '─'.repeat(60) + '\n\n'
      text += 'AI EXECUTIVE SUMMARY\n\n'
      text += aiSummary + '\n\n'
      text += '(Confidential — for council records only. AI-generated from portal data.)\n'
    }

    return text
  }

  // ── Download actions ───────────────────────────────────────────────

  function handleDownloadText() {
    const text = buildReportText()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archive-report-${target.first_name}-${target.last_name}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadPDF() {
    const { generateArchiveReportPDF } = await import('../../../../utils/generateArchiveReportPDF')

    let completionText = `${totalCompleted} of ${total} requirements completed\n\n`
    for (const [type, reqs] of Object.entries(grouped)) {
      completionText += `${TYPE_LABELS[type] || type}\n`
      for (const req of reqs) {
        const title = reqTitle(req)
        const grade = getGrade(req)
        const done = req.status === 'complete' || req.status === 'graded'
        const customTag = req.template_id === null ? ' [custom]' : ''
        completionText += `${done ? '✓' : '○'} ${title}${customTag} — ${req.status}${grade !== '—' ? ` (${grade})` : ''}\n`
      }
      completionText += '\n'
    }
    if (waivedRequirements.length > 0) {
      completionText += `Waived (${waivedRequirements.length})\n`
      for (const req of waivedRequirements) {
        const reason = req.waived_reason ? ` — ${req.waived_reason}` : ''
        completionText += `• ${reqTitle(req)}${reason}\n`
      }
      completionText += '\n'
    }

    let interviewText = ''
    if (interviewDate) interviewText += `Date: ${interviewDate}\n`
    if (interviewResult) interviewText += `Result: ${RESULT_LABELS[interviewResult] || interviewResult}\n`
    const pdfScoredSections = INTERVIEW_SECTIONS.filter(s => interviewFinalScores[s.id])
    if (pdfScoredSections.length > 0) {
      interviewText += 'Section Grades:\n'
      for (const s of pdfScoredSections) {
        const grade = interviewFinalScores[s.id] as InterviewRating
        interviewText += `  ${s.title}: ${INTERVIEW_RATING_LABELS[grade] || grade}\n`
      }
    }
    if (interviewNotes) interviewText += `Notes: ${interviewNotes}\n`

    let ordText = ''
    if (ordinationDate) ordText += `Date: ${ordinationDate}\n`
    if (officiant) ordText += `Officiant: ${officiant}\n`

    await generateArchiveReportPDF({
      candidate: { first_name: target.first_name, last_name: target.last_name, cohorts: target.cohorts },
      completionSummary: completionText.trim(),
      interviewSection: interviewText.trim(),
      ordinationSection: ordText.trim(),
      evaluationSection: evaluationSummary,
      mentorSection: mentorSummary,
      aiSummary,
    })
  }

  // ── Save to DB ─────────────────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true)
    setSaveStatus('idle')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setIsSaving(false); setSaveStatus('error'); return }

    const res = await fetch('/api/admin/archive-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        action: 'save',
        ordinandId: target.id,
        interviewId: interviewId || undefined,
        reportText: buildReportText(),
        aiSummary,
        interviewDate: interviewDate || undefined,
        interviewResult: interviewResult || undefined,
        ordinationDate: ordinationDate || undefined,
        officiant: officiant || undefined,
      }),
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
    setIsSaving(false)
  }

  // ── Email ──────────────────────────────────────────────────────────

  function toggleRecipient(email: string) {
    setEmailRecipients(prev => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  function addCustomRecipient() {
    const trimmed = customEmail.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return
    setEmailRecipients(prev => { const next = new Set(prev); next.add(trimmed); return next })
    setCustomEmail('')
  }

  async function handleSendEmail() {
    if (emailRecipients.size === 0) return
    setIsSendingEmail(true)
    setEmailStatus(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setEmailStatus({ type: 'error', text: 'Session expired' }); setIsSendingEmail(false); return }

    const recipients = Array.from(emailRecipients).map(email => {
      const member = councilMembers.find(m => m.email === email)
      return member ? { email, name: `${member.first_name} ${member.last_name}` } : { email }
    })

    const res = await fetch('/api/admin/archive-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        action: 'email',
        reportText: buildReportText(),
        candidateName: `${target.first_name} ${target.last_name}`,
        recipients,
      }),
    })

    if (res.ok) {
      setEmailStatus({ type: 'success', text: `Report sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}` })
      setShowEmailPanel(false)
    } else {
      setEmailStatus({ type: 'error', text: 'Failed to send email' })
    }
    setIsSendingEmail(false)
  }

  // ── Confirm step ───────────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <ModalWrapper onClose={onClose} ariaLabel="Archive ordinand" maxWidth="max-w-lg">
        <div className="p-8">
          <h2 className="text-lg font-black text-slate-900 mb-1">
            {mode === 'delete' ? 'Delete' : 'Complete'} {target.first_name} {target.last_name}?
          </h2>
          <p className="text-sm text-slate-500 font-medium mb-6">
            {mode === 'delete'
              ? 'This will remove the profile entirely. Use for test accounts and migration artifacts.'
              : "This will mark the ordinand as complete and move them to the archived section. All records will be preserved."}
          </p>

          <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Archive report includes</p>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>Assignment completion summary (all 17 requirements)</span></div>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>External evaluations (mentor &amp; church board)</span></div>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>Mentor report summary</span></div>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>Oral interview date, result &amp; notes</span></div>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>AI-generated executive summary</span></div>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>PDF download, email, &amp; permanent DB record</span></div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerateReport}
              className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all"
              style={{ backgroundColor: C.deepSea }}
            >
              📄 Generate Report
            </button>
            <button
              onClick={onArchive}
              disabled={isArchiving}
              className="px-5 py-2.5 rounded-xl font-black text-sm transition-all"
              style={{
                backgroundColor: isArchiving ? '#aaa' : mode === 'delete' ? '#fef2f2' : '#f0fdf4',
                color: isArchiving ? '#fff' : mode === 'delete' ? '#b91c1c' : '#15803d',
                cursor: isArchiving ? 'not-allowed' : 'pointer',
              }}
            >
              {isArchiving ? 'Processing...' : `Skip & ${mode === 'delete' ? 'Delete' : 'Complete'}`}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
              Cancel
            </button>
          </div>
        </div>
      </ModalWrapper>
    )
  }

  // ── Report step ────────────────────────────────────────────────────

  return (
    <ModalWrapper onClose={onClose} ariaLabel="Archive report" maxWidth="max-w-3xl" innerClassName="max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Archive Report</p>
          <h2 className="text-lg font-black text-slate-900">{target.first_name} {target.last_name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {requirements.length > 0 && (
            <>
              <button
                onClick={() => { setShowEmailPanel(!showEmailPanel); setEmailStatus(null) }}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
                style={{
                  backgroundColor: showEmailPanel ? '#f0f7ff' : 'transparent',
                  borderColor: showEmailPanel ? '#0077C8' : '#e2e8f0',
                  color: showEmailPanel ? '#0077C8' : '#64748b',
                }}
              >
                ✉ Email
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
                style={{ backgroundColor: C.allianceBlue }}
              >
                ↓ PDF
              </button>
              <button
                onClick={handleDownloadText}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all"
              >
                ↓ TXT
              </button>
            </>
          )}
        </div>
      </div>

      {/* Email panel */}
      {showEmailPanel && (
        <div className="px-8 py-4 bg-blue-50/50 border-b border-blue-100 flex-shrink-0">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Send report to</p>
          {councilMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {councilMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleRecipient(m.email)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                  style={{
                    backgroundColor: emailRecipients.has(m.email) ? '#0077C8' : '#fff',
                    color: emailRecipients.has(m.email) ? '#fff' : '#64748b',
                    borderColor: emailRecipients.has(m.email) ? '#0077C8' : '#e2e8f0',
                  }}
                >
                  {m.first_name} {m.last_name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center mb-3">
            <input
              type="email"
              placeholder="Add email address..."
              value={customEmail}
              onChange={e => setCustomEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomRecipient() } }}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button onClick={addCustomRecipient} className="px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
              Add
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              {emailRecipients.size === 0 ? 'Select at least one recipient' : `${emailRecipients.size} recipient${emailRecipients.size > 1 ? 's' : ''}`}
            </span>
            <button
              onClick={handleSendEmail}
              disabled={emailRecipients.size === 0 || isSendingEmail}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
              style={{ backgroundColor: emailRecipients.size === 0 || isSendingEmail ? '#94a3b8' : '#0077C8' }}
            >
              {isSendingEmail ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </div>
      )}

      {/* Email / save status */}
      {emailStatus && (
        <div className={`px-8 py-2.5 text-xs font-bold flex-shrink-0 ${emailStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {emailStatus.text}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6" ref={summaryRef}>

        {/* Loading */}
        {loadingData ? (
          <div className="flex items-center gap-3 text-slate-400">
            <span className="animate-spin text-xl">⏳</span>
            <span className="font-medium text-sm">Loading report data…</span>
          </div>
        ) : requirements.length > 0 ? (
          <>
            {/* Completion summary */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Completion Summary</h3>
                <span className="text-sm font-black" style={{ color: totalCompleted === total ? '#16a34a' : C.deepSea }}>
                  {totalCompleted} / {total} completed
                </span>
              </div>
              {Object.entries(grouped).map(([type, reqs]) => (
                <div key={type} className="mb-4">
                  <p className="text-xs font-bold text-slate-500 mb-2">{TYPE_LABELS[type] || type}</p>
                  <div className="space-y-1">
                    {reqs.map(req => {
                      const s = req.status as string
                      const config = STATUS_CONFIG[s]
                      const grade = getGrade(req)
                      return (
                        <div key={req.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${s === 'complete' || s === 'graded' ? 'bg-green-500' : s === 'submitted' || s === 'under_review' ? 'bg-blue-400' : s === 'in_progress' || s === 'revision_required' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                            <span className="text-sm font-medium text-slate-700">{req.requirement_templates?.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {grade !== '—' && <span className="text-xs font-bold text-slate-400 capitalize">{grade}</span>}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(config as any)?.badge ?? 'bg-slate-100 text-slate-500'}`}>
                              {(config as any)?.label ?? s}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Interview + ordination fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Oral Interview</p>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Date</label>
                  <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Result</label>
                  <select value={interviewResult} onChange={e => setInterviewResult(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 bg-white">
                    <option value="">Not recorded</option>
                    <option value="sustained">Sustained</option>
                    <option value="conditional">Conditionally Sustained</option>
                    <option value="deferred">Deferred</option>
                    <option value="not_sustained">Not Sustained</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Notes</label>
                  <textarea value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                    placeholder="Interview & deliberation notes…" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ordination Service</p>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Date</label>
                  <input type="date" value={ordinationDate} onChange={e => setOrdinationDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Officiant</label>
                  <input type="text" value={officiant} onChange={e => setOfficiant(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Name of officiating minister" />
                </div>
              </div>
            </div>

            {/* Evaluations section */}
            {evaluationSummary && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">External Evaluations</p>
                <pre className="text-sm text-slate-600 font-medium whitespace-pre-wrap bg-slate-50 rounded-2xl p-4 border border-slate-100"
                  style={{ fontFamily: 'inherit', lineHeight: '1.6' }}>
                  {evaluationSummary}
                </pre>
              </div>
            )}

            {/* Mentor summary */}
            {mentorSummary && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Mentor Report</p>
                <p className="text-sm text-slate-600 font-medium bg-slate-50 rounded-2xl p-4 border border-slate-100" style={{ lineHeight: '1.6' }}>
                  {mentorSummary}
                </p>
              </div>
            )}

            {/* AI summary */}
            {!aiSummary && !isGeneratingAI && (
              <button
                onClick={handleGenerateAI}
                className="w-full py-3 rounded-xl text-sm font-bold border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all"
              >
                ✨ Generate AI Executive Summary
              </button>
            )}

            {(isGeneratingAI || aiSummary) && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">AI Executive Summary</p>
                {isGeneratingAI && !aiSummary && (
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="animate-spin text-xl">⏳</span>
                    <span className="font-medium text-sm">Generating summary…</span>
                  </div>
                )}
                {aiSummary && (
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '0.8rem',
                    lineHeight: '1.7',
                    color: '#334155',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                  }}>
                    {aiSummary}
                    {isGeneratingAI && <span className="animate-pulse">▍</span>}
                  </pre>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || requirements.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{
              backgroundColor: saveStatus === 'saved' ? '#f0fdf4' : isSaving ? '#f8fafc' : 'transparent',
              borderColor: saveStatus === 'saved' ? '#86efac' : '#e2e8f0',
              color: saveStatus === 'saved' ? '#15803d' : saveStatus === 'error' ? '#b91c1c' : '#64748b',
            }}
          >
            {isSaving ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved to DB' : saveStatus === 'error' ? '✕ Save failed' : '💾 Save Record'}
          </button>
          <p className="text-xs text-slate-400 font-medium">Confidential — for district records only.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onArchive}
            disabled={isArchiving}
            className="px-5 py-2.5 rounded-xl font-black text-xs transition-all"
            style={{
              backgroundColor: isArchiving ? '#aaa' : mode === 'delete' ? '#fef2f2' : '#f0fdf4',
              color: isArchiving ? '#fff' : mode === 'delete' ? '#b91c1c' : '#15803d',
              cursor: isArchiving ? 'not-allowed' : 'pointer',
            }}
          >
            {isArchiving ? 'Processing…' : mode === 'delete' ? 'Delete Ordinand' : 'Mark Complete'}
          </button>
          <button onClick={() => setStep('confirm')} className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
            ← Back
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}
