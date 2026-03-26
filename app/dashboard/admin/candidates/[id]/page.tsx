// app/dashboard/admin/candidates/[id]/page.tsx
// Ordinand detail: edit profile, reassign cohort, manage graders, grade submissions, send progress email
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { SELF_ASSESSMENT_TOPICS, PAPER_SECTIONS } from '../../../../../utils/selfAssessmentQuestions'

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
  not_started:       { label: 'Not Started',      colour: 'bg-slate-100 text-slate-500' },
  submitted:         { label: 'Submitted',         colour: 'bg-blue-100 text-blue-700' },
  under_review:      { label: 'Under Review',      colour: 'bg-amber-100 text-amber-700' },
  revision_required: { label: 'Revision Required', colour: 'bg-red-100 text-red-700' },
  complete:          { label: 'Complete',           colour: 'bg-green-100 text-green-700' },
}

const TYPE_LABELS: Record<string, string> = {
  book_report: 'Book Reports',
  paper: 'Theological Papers',
  sermon: 'Sermons',
}

const TOPIC_LABELS: Record<string, string> = {
  christ_centred:   'Christ-Centred Life and Ministry',
  spirit_empowered: 'Spirit-Empowered Life and Ministry',
  mission_focused:  'Mission-Focused Life and Ministry',
  scripture:        'The Scriptures',
  divine_healing:   'Divine Healing',
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [candidate, setCandidate] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [cohorts, setCohorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

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
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [rating, setRating] = useState<Rating | ''>('')
  const [comments, setComments] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [reassigningId, setReassigningId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState<{ id: string; mode: 'unsubmitted' | 'submitted' } | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  // Admin upload state
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDate, setUploadDate] = useState<string>(() => new Date().toISOString().split('T')[0])

  // Self-assessment modal state
  const [saReq, setSaReq] = useState<any | null>(null)
  const [saQuestionRatings, setSaQuestionRatings] = useState<Record<string, string>>({})
  const [saCompletenessEvidence, setSaCompletenessEvidence] = useState('')
  const [saRatings, setSaRatings] = useState<Record<string, string>>({})
  const [saEvidence, setSaEvidence] = useState<Record<string, string>>({})
  const [isSavingSA, setIsSavingSA] = useState(false)

  // Grader selector inside grade modal
  const [modalGraderId, setModalGraderId] = useState<string>('')

  // External evaluation tokens
  const [evalTokens, setEvalTokens]           = useState<any[]>([])
  const [evalInviteModal, setEvalInviteModal] = useState<{ type: 'mentor' | 'church'; name: string; email: string } | null>(null)
  const [isSendingEval, setIsSendingEval]     = useState(false)
  const [viewingEval, setViewingEval]         = useState<any>(null)
  const [evalDetail, setEvalDetail]           = useState<any>(null)
  const [loadingEvalDetail, setLoadingEvalDetail] = useState(false)

  // AI Interview Brief
  const [showBrief, setShowBrief]             = useState(false)
  const [briefContent, setBriefContent]       = useState('')
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false)

  const [isObserver, setIsObserver] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  function denyObserver(): boolean {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return true }
    return false
  }

  function openEvalInviteModal(type: 'mentor' | 'church') {
    setEvalInviteModal({
      type,
      name:  type === 'mentor' ? (candidate?.mentor_name  || '') : '',
      email: type === 'mentor' ? (candidate?.mentor_email || '') : '',
    })
  }

  async function handleSendEvalInvite() {
    if (denyObserver()) return
    if (!evalInviteModal) return
    if (!evalInviteModal.name.trim() || !evalInviteModal.email.trim()) {
      flash('Recipient name and email address are required.', 'error')
      return
    }
    setIsSendingEval(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { flash('Session expired — please refresh.', 'error'); setIsSendingEval(false); return }

    const res = await fetch('/api/admin/send-evaluation-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        ordinandId:     id,
        ordinandName:   `${candidate.first_name} ${candidate.last_name}`,
        evalType:       evalInviteModal.type,
        recipientName:  evalInviteModal.name.trim(),
        recipientEmail: evalInviteModal.email.trim().toLowerCase(),
      }),
    })
    const result = await res.json()
    if (!res.ok) { flash('Error: ' + result.error, 'error') }
    else {
      flash(`${evalInviteModal.type === 'mentor' ? 'Mentor' : 'Church board'} evaluation invitation sent to ${evalInviteModal.name}.`, 'success')
      setEvalInviteModal(null)
      fetchData(true)
    }
    setIsSendingEval(false)
  }

  async function handleDownloadPDF() {
    const { jsPDF } = await import('jspdf')

    const PW = 612, PH = 792   // letter, points
    const ML = 60, MR = 60      // left / right margin
    const CW = PW - ML - MR     // content width
    const HEADER_H = 40, FOOTER_H = 32

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

    const KNOWN_HEADERS = new Set([
      'CANDIDATE OVERVIEW', 'ASSIGNMENT COMPLETION SUMMARY',
      'COUNCIL-IDENTIFIED STRENGTHS', 'AREAS FOR CONTINUED GROWTH',
      'SELF-ASSESSMENT INSIGHT', 'PARDINGTON STUDY PATTERNS',
      'SUGGESTED INTERVIEW PROBES',
    ])

    let y = 0

    function drawPageHeader() {
      doc.setFillColor(0, 66, 106)
      doc.rect(0, 0, PW, HEADER_H, 'F')
      doc.setFillColor(0, 119, 200)
      doc.rect(0, HEADER_H - 2, PW, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.text('CMD ORDINATION PORTAL', ML, 25)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Canadian Midwest District · The Alliance Canada', PW - MR, 25, { align: 'right' })
      y = HEADER_H + 44
    }

    function drawPageFooter(pageNum: number, pageCount: number) {
      doc.setFillColor(241, 245, 249)
      doc.rect(0, PH - FOOTER_H, PW, FOOTER_H, 'F')
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.5)
      doc.line(0, PH - FOOTER_H, PW, PH - FOOTER_H)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.text('CONFIDENTIAL — For CMD Ordination Council Use Only', ML, PH - 12)
      doc.text(`Page ${pageNum} of ${pageCount}`, PW - MR, PH - 12, { align: 'right' })
    }

    function checkBreak(needed: number) {
      if (y + needed > PH - FOOTER_H - 16) {
        doc.addPage()
        drawPageHeader()
      }
    }

    // ── Page 1 ──────────────────────────────────────────────────────────────
    drawPageHeader()

    // Title block
    doc.setDrawColor(0, 119, 200)
    doc.setLineWidth(1.5)
    doc.line(ML, y, PW - MR, y)
    y += 20

    doc.setTextColor(0, 66, 106)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('Oral Interview Brief', ML, y)
    y += 26

    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(`${candidate.first_name} ${candidate.last_name}`, ML, y)
    y += 16

    if (candidate.cohorts) {
      doc.setTextColor(71, 85, 105)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const cohortLabel = `${candidate.cohorts.season} ${candidate.cohorts.year} Cohort`
      doc.text(cohortLabel, ML, y)
      y += 14
    }

    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const dateStr = new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    doc.text(`Generated ${dateStr}`, ML, y)
    y += 8

    doc.setDrawColor(0, 119, 200)
    doc.setLineWidth(1.5)
    doc.line(ML, y, PW - MR, y)
    y += 28

    // ── Markdown helpers ─────────────────────────────────────────────────────
    type Seg = { text: string; bold: boolean; italic: boolean }

    function parseInline(text: string): Seg[] {
      const segs: Seg[] = []
      const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
      let last = 0, m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) segs.push({ text: text.slice(last, m.index), bold: false, italic: false })
        if (m[1] !== undefined) segs.push({ text: m[1], bold: true, italic: false })
        else segs.push({ text: m[2], bold: false, italic: true })
        last = re.lastIndex
      }
      if (last < text.length) segs.push({ text: text.slice(last), bold: false, italic: false })
      return segs.filter(s => s.text.length > 0)
    }

    function stripInline(text: string): string {
      return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
    }

    // Renders mixed bold/italic/normal segments word-by-word, returns line count
    function renderFormatted(segs: Seg[], x: number, startY: number, maxW: number, fontSize: number, lineH: number): number {
      const tokens: { word: string; bold: boolean; italic: boolean }[] = []
      for (const seg of segs) {
        for (const word of seg.text.split(/(\s+)/)) {
          if (word) tokens.push({ word, bold: seg.bold, italic: seg.italic })
        }
      }
      let cx = x, cy = startY, lines = 1
      for (const t of tokens) {
        if (/^\s+$/.test(t.word)) continue // spaces handled via prefix
        const style = t.bold ? 'bold' : t.italic ? 'italic' : 'normal'
        doc.setFont('helvetica', style)
        doc.setFontSize(fontSize)
        const prefix = cx > x ? ' ' : ''
        const w = doc.getTextWidth(prefix + t.word)
        if (cx > x && cx + w > x + maxW) {
          cy += lineH; cx = x; lines++
          doc.text(t.word, cx, cy)
          cx += doc.getTextWidth(t.word)
        } else {
          doc.text(prefix + t.word, cx, cy)
          cx += w
        }
      }
      return lines
    }

    function estimateLines(plain: string, maxW: number, fontSize: number): number {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fontSize)
      return (doc.splitTextToSize(plain, maxW) as string[]).length
    }

    // ── Brief content ────────────────────────────────────────────────────────
    const lines = briefContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === '---') { y += 5; continue }

      // ## headers — strip prefix, check if it's a known section or a sub-header
      const isMarkdownHeader = /^#{1,3}\s/.test(trimmed)
      const headerText = isMarkdownHeader ? trimmed.replace(/^#+\s*/, '') : trimmed
      const headerKey = headerText.toUpperCase()

      if (KNOWN_HEADERS.has(headerKey) || KNOWN_HEADERS.has(trimmed)) {
        // Full section header with blue left-bar
        y += 8
        checkBreak(30)
        doc.setFillColor(235, 245, 255)
        doc.rect(ML - 6, y - 14, CW + 12, 24, 'F')
        doc.setFillColor(0, 119, 200)
        doc.rect(ML - 6, y - 14, 3, 24, 'F')
        doc.setTextColor(0, 66, 106)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.text(headerKey, ML + 8, y + 2)
        y += 20

      } else if (isMarkdownHeader) {
        // Sub-header (## or ### not in the known list)
        checkBreak(22)
        doc.setTextColor(0, 66, 106)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(stripInline(headerText), ML, y)
        y += 18

      } else if (/^[-•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
        // Bullet or numbered item — strip bullet, parse inline formatting
        const isNumbered = /^\d+\.\s/.test(trimmed)
        const bulletChar = isNumbered ? (trimmed.match(/^(\d+\.)/)?.[1] ?? '•') : '•'
        const itemText = trimmed.replace(/^[-•]\s+/, '').replace(/^\d+\.\s+/, '')
        const plain = stripInline(itemText)
        const est = estimateLines(plain, CW - 18, 10)
        checkBreak(est * 13 + 4)
        doc.setTextColor(30, 41, 59)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(bulletChar, ML + 4, y)
        const rendered = renderFormatted(parseInline(itemText), ML + 18, y, CW - 18, 10, 13)
        y += rendered * 13 + 4

      } else {
        // Body paragraph — parse inline formatting
        const plain = stripInline(trimmed)
        const est = estimateLines(plain, CW, 10)
        checkBreak(est * 14 + 4)
        doc.setTextColor(30, 41, 59)
        doc.setFontSize(10)
        const rendered = renderFormatted(parseInline(trimmed), ML, y, CW, 10, 14)
        y += rendered * 14 + 4
      }
    }

    // ── Footers on all pages ─────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      drawPageFooter(i, totalPages)
    }

    const safeName = `${candidate.first_name ?? ''}-${candidate.last_name ?? ''}`.replace(/[^a-zA-Z0-9-]/g, '')
    doc.save(`Interview-Brief-${safeName}.pdf`)
  }

  async function handleGenerateBrief() {
    setShowBrief(true)
    setBriefContent('')
    setIsGeneratingBrief(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBriefContent('Session expired — please refresh the page.'); setIsGeneratingBrief(false); return }
    try {
      const res = await fetch('/api/admin/interview-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ ordinandId: id }),
      })
      if (!res.ok || !res.body) { setBriefContent('Error generating brief — please try again.'); setIsGeneratingBrief(false); return }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setBriefContent(prev => prev + decoder.decode(value, { stream: true }))
      }
    } catch {
      setBriefContent('Error generating brief — please try again.')
    }
    setIsGeneratingBrief(false)
  }

  async function loadEvalDetail(evalTokenId: string) {
    setLoadingEvalDetail(true)
    const { data } = await supabase
      .from('evaluations')
      .select('*')
      .eq('token_id', evalTokenId)
      .single()
    setEvalDetail(data)
    setLoadingEvalDetail(false)
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
      .select('id, first_name, last_name')
      .contains('roles', ['council'])
      .order('last_name')
    setCouncilMembers(council || [])

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
      fetch('/api/notify-grader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  async function handleAdminUpload(req: any, file: File, dateStr: string) {
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
      await supabase.from('submissions').update({ file_url: publicUrl, submitted_at: submittedAt }).eq('id', existingSubmission.id)
      submissionId = existingSubmission.id
    } else {
      const { data: newSub, error: subError } = await supabase.from('submissions').insert({
        ordinand_id: id,
        ordinand_requirement_id: req.id,
        file_url: publicUrl,
        file_name: file.name,
        version: 1,
        submitted_at: submittedAt,
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
    const submission = Array.isArray(req.submissions) ? req.submissions[0] : req.submissions
    if (submission?.self_assessment?.version === 2) {
      const s = submission.self_assessment.sections || {}
      setSaQuestionRatings(s.completeness?.question_ratings || {})
      setSaCompletenessEvidence(s.completeness?.evidence || '')
      const ratings: Record<string, string> = {}
      const evidence: Record<string, string> = {}
      PAPER_SECTIONS.filter(p => p.id !== 'completeness').forEach(section => {
        ratings[section.id] = s[section.id]?.rating || ''
        evidence[section.id] = s[section.id]?.evidence || ''
      })
      setSaRatings(ratings)
      setSaEvidence(evidence)
    } else {
      setSaQuestionRatings({})
      setSaCompletenessEvidence('')
      setSaRatings({})
      setSaEvidence({})
    }
    setSaReq(req)
  }

  async function handleSaveSelfAssessment() {
    if (denyObserver()) return
    if (!saReq) return
    const submission = Array.isArray(saReq.submissions) ? saReq.submissions[0] : saReq.submissions
    if (!submission?.id) { flash('No submission found — upload the file first.', 'error'); return }
    setIsSavingSA(true)
    const sectionData: Record<string, any> = {
      completeness: { question_ratings: saQuestionRatings, evidence: saCompletenessEvidence },
    }
    PAPER_SECTIONS.filter(s => s.id !== 'completeness').forEach(section => {
      sectionData[section.id] = { rating: saRatings[section.id] || '', evidence: saEvidence[section.id] || '' }
    })
    const { error } = await supabase
      .from('submissions')
      .update({ self_assessment: { version: 2, sections: sectionData } })
      .eq('id', submission.id)
    if (error) {
      flash('Failed to save self-assessment: ' + error.message, 'error')
    } else {
      flash('Self-assessment saved', 'success')
      setSaReq(null)
      fetchData()
    }
    setIsSavingSA(false)
  }

  async function handleSaveGrade() {
    if (denyObserver()) return
    if (!selectedReq || !rating) return
    setIsSaving(true)
    const gaId = Array.isArray(selectedReq.grading_assignments) ? selectedReq.grading_assignments[0]?.id : selectedReq.grading_assignments?.id
    const submission = Array.isArray(selectedReq.submissions) ? selectedReq.submissions[0] : selectedReq.submissions
    if (!submission?.id) { flash('No submission found to grade.', 'error'); setIsSaving(false); return }
    const { data: currentUser } = await supabase.auth.getUser()
    const gradedBy = modalGraderId || currentUser.user?.id

    // grading_assignment_id is NOT NULL in grades — always ensure one exists
    let resolvedGaId = gaId
    if (modalGraderId && gaId) {
      // Update existing assignment to the chosen grader
      await supabase.from('grading_assignments').update({ council_member_id: modalGraderId, reassigned_at: new Date().toISOString() }).eq('id', gaId)
    } else if (!resolvedGaId || modalGraderId) {
      // Create a new assignment (either no existing one, or a specific grader was chosen)
      const { data: newGa } = await supabase.from('grading_assignments').insert({
        ordinand_requirement_id: selectedReq.id,
        council_member_id: gradedBy,
        assigned_by: currentUser.user?.id,
      }).select('id').single()
      resolvedGaId = newGa?.id
    }

    if (!resolvedGaId) { flash('Could not create grading assignment.', 'error'); setIsSaving(false); return }

    const { error: gradeError } = await supabase.from('grades').upsert({ submission_id: submission.id, grading_assignment_id: resolvedGaId, overall_rating: rating, overall_comments: comments, graded_by: gradedBy, graded_at: new Date().toISOString() }, { onConflict: 'submission_id' })
    if (gradeError) { flash('Error saving grade: ' + gradeError.message, 'error'); setIsSaving(false); return }
    const newStatus: Status = rating === 'insufficient' ? 'revision_required' : 'complete'
    await supabase.from('ordinand_requirements').update({ status: newStatus }).eq('id', selectedReq.id)
    flash('Grade saved.', 'success')
    setSelectedReq(null); setRating(''); setComments(''); setModalGraderId('')
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

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/handbook" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>📖 Handbook</Link>
          <Link href="/dashboard/admin" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Admin Console</Link>
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
                                        if (file) handleAdminUpload(req, file, uploadDate)
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
                              onClick={() => { setSelectedReq(req); setRating(grade?.overall_rating ?? ''); setComments(grade?.overall_comments ?? '') }}
                              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm"
                            >
                              Grade →
                            </button>
                          )}
                          {status === 'complete' && grade && (
                            <button
                              onClick={() => { setSelectedReq(req); setRating(grade.overall_rating); setComments(grade.overall_comments ?? '') }}
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
                          onClick={() => { setViewingEval(tok); loadEvalDetail(tok.id) }}
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

          {/* AI Interview Brief */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
            <div className="px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Interview Brief</h2>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Synthesizes grades, feedback, self-assessments, Pardington sessions, and evaluations into a council-ready briefing document.
                </p>
              </div>
              <button
                onClick={handleGenerateBrief}
                disabled={isGeneratingBrief}
                className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all flex-shrink-0"
                style={{ backgroundColor: isGeneratingBrief ? '#94a3b8' : '#00426A' }}
              >
                {isGeneratingBrief ? '⏳ Generating…' : '✨ Generate Brief'}
              </button>
            </div>
            <div className="px-8 py-4 text-xs text-slate-400 font-medium leading-relaxed">
              Use this before an oral interview. The brief draws on all available data — the more complete the record, the richer the output. It does not make a pass/fail recommendation; it helps the council have a more informed, personal conversation.
            </div>
          </div>

          {/* AI Interview Brief modal */}
          {showBrief && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: '#0077C8' }}>AI Interview Brief</p>
                    <h3 className="text-lg font-black text-slate-900">
                      {candidate.first_name} {candidate.last_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {briefContent && !isGeneratingBrief && (
                      <button
                        onClick={handleDownloadPDF}
                        className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: '#00426A' }}
                      >
                        ↓ Download PDF
                      </button>
                    )}
                    <button
                      onClick={() => setShowBrief(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-all text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {/* Content */}
                <div className="overflow-y-auto flex-1 px-8 py-6">
                  {isGeneratingBrief && briefContent === '' && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="animate-spin text-xl">⏳</span>
                      <span className="font-medium text-sm">Gathering data and composing brief…</span>
                    </div>
                  )}
                  {briefContent && (
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '0.875rem',
                      lineHeight: '1.75',
                      color: '#1e293b',
                    }}>
                      {briefContent}
                      {isGeneratingBrief && <span className="animate-pulse">▍</span>}
                    </pre>
                  )}
                </div>
                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-100 flex-shrink-0">
                  <p className="text-xs text-slate-400 font-medium">
                    Confidential — for council use only. Generated by AI from available portal data; exercise pastoral judgment in interpretation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send evaluation invitation modal */}
          {evalInviteModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-[#0077C8] uppercase tracking-widest mb-1">
                      {evalInviteModal.type === 'mentor' ? 'Mentor Evaluation' : 'Church Board Evaluation'}
                    </p>
                    <h3 className="text-lg font-black text-slate-900">Send Invitation</h3>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">{candidate?.first_name} {candidate?.last_name}</p>
                  </div>
                  <button onClick={() => setEvalInviteModal(null)} className="text-slate-400 hover:text-slate-700 font-black text-xl mt-1">✕</button>
                </div>

                <div className="px-8 py-6 space-y-5">
                  {/* Recipient fields */}
                  <div>
                    <label className={labelClass}>
                      {evalInviteModal.type === 'mentor' ? 'Mentor Name' : 'Recipient Name'}
                    </label>
                    <input
                      className={inputClass}
                      value={evalInviteModal.name}
                      onChange={e => setEvalInviteModal(m => m ? { ...m, name: e.target.value } : m)}
                      placeholder="Full name"
                    />
                    {evalInviteModal.type === 'mentor' && !candidate?.mentor_name && (
                      <p className="text-xs text-amber-600 font-medium mt-1">⚠ No mentor name on file — add it in the profile section above.</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>
                      {evalInviteModal.type === 'mentor' ? 'Mentor Email Address' : 'Recipient Email Address'}
                    </label>
                    <input
                      className={inputClass}
                      type="email"
                      value={evalInviteModal.email}
                      onChange={e => setEvalInviteModal(m => m ? { ...m, email: e.target.value } : m)}
                      placeholder="email@example.com"
                    />
                    {evalInviteModal.type === 'mentor' && !candidate?.mentor_email && (
                      <p className="text-xs text-amber-600 font-medium mt-1">⚠ No mentor email on file — add it in the profile section above.</p>
                    )}
                  </div>

                  {/* Email preview */}
                  <div>
                    <label className={labelClass}>Email Preview</label>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden text-sm">
                      {/* Preview header */}
                      <div style={{ background: '#00426A', borderBottom: '3px solid #0077C8', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/cmd-logo.png" style={{ height: '24px' }} alt="CMD" />
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.05em' }}>CMD ORDINATION PORTAL</span>
                      </div>
                      {/* Preview body */}
                      <div className="p-5 bg-white space-y-3 text-slate-600 leading-relaxed">
                        <p>Dear <strong className="text-slate-800">{evalInviteModal.name || '[Recipient Name]'}</strong>,</p>
                        <p className="text-xs">
                          {evalInviteModal.type === 'mentor'
                            ? `You are receiving this message because you have been serving as the ministry mentor for `
                            : `You are receiving this message as a representative of the Board of Elders for the church where `
                          }
                          <strong className="text-slate-800">{candidate?.first_name} {candidate?.last_name}</strong>
                          {evalInviteModal.type === 'mentor' ? '.' : ' serves in ministry.'}
                        </p>
                        <p className="text-xs">
                          As {candidate?.first_name} approaches the final stage of the ordination process with the Canadian Midwest District,
                          the Ordaining Council is gathering evaluations from those who know them best in ministry context.
                          Your honest and thoughtful response is an important part of this process.
                        </p>
                        <div className="py-1">
                          <span className="inline-block bg-[#00426A] text-white px-5 py-2.5 rounded-lg font-bold text-xs">Complete the Evaluation →</span>
                        </div>
                        <p className="text-xs text-slate-400">This link is personal to you and expires after a single submission. The form takes approximately 15–20 minutes to complete.</p>
                      </div>
                      {/* Preview footer */}
                      <div className="bg-slate-50 border-t border-slate-200 py-3 px-5 text-center">
                        <p className="text-xs text-slate-400">Canadian Midwest District · The Alliance Canada · ordination.canadianmidwest.ca</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleSendEvalInvite}
                      disabled={isSendingEval || !evalInviteModal.name.trim() || !evalInviteModal.email.trim()}
                      className="px-6 py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50"
                      style={{ backgroundColor: isSendingEval ? '#aaa' : '#00426A', cursor: isSendingEval ? 'not-allowed' : 'pointer' }}
                    >
                      {isSendingEval ? 'Sending…' : 'Send Invitation'}
                    </button>
                    <button onClick={() => setEvalInviteModal(null)} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evaluation response modal */}
          {viewingEval && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-start rounded-t-3xl">
                  <div>
                    <p className="text-xs font-black text-[#0077C8] uppercase tracking-widest mb-1">
                      {viewingEval.eval_type === 'mentor' ? 'Mentor Evaluation' : 'Church Board Evaluation'}
                    </p>
                    <h3 className="text-lg font-black text-slate-900">{candidate?.first_name} {candidate?.last_name}</h3>
                    {evalDetail?.evaluator_name && <p className="text-sm text-slate-400 font-medium mt-0.5">Submitted by {evalDetail.evaluator_name}</p>}
                  </div>
                  <button onClick={() => { setViewingEval(null); setEvalDetail(null) }} className="text-slate-400 hover:text-slate-700 font-black text-xl">✕</button>
                </div>
                <div className="px-8 py-6 space-y-6">
                  {loadingEvalDetail ? (
                    <p className="text-slate-400 text-center font-medium py-8">Loading response…</p>
                  ) : evalDetail ? (
                    <>
                      {viewingEval.eval_type === 'church' && evalDetail.ministry_start_date && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Ministry Commenced</p>
                          <p className="text-sm font-medium text-slate-800">{new Date(evalDetail.ministry_start_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      )}
                      {viewingEval.eval_type === 'church' && evalDetail.board_member_position && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Board Position</p>
                          <p className="text-sm font-medium text-slate-800">{evalDetail.board_member_position}</p>
                        </div>
                      )}
                      {[
                        { key: 'q1_call', label: "1. God's Call" },
                        { key: 'q2_strengths', label: '2. Ministry Strengths' },
                        { key: 'q3_development', label: '3. Areas for Development' },
                      ].map(({ key, label }) => evalDetail[key] && (
                        <div key={key}>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                          <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{evalDetail[key]}</p>
                        </div>
                      ))}
                      {evalDetail.q4_ratings && Object.keys(evalDetail.q4_ratings).length > 0 && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">4. General Evaluation Ratings</p>
                          <div className="space-y-2">
                            {Object.entries(evalDetail.q4_ratings).map(([cat, rating]) => (
                              <div key={cat} className="flex items-center justify-between gap-4 py-1 border-b border-slate-50">
                                <p className="text-xs font-medium text-slate-600">{cat}</p>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                                  rating === 'exceptional' ? 'bg-emerald-100 text-emerald-700' :
                                  rating === 'excellent'   ? 'bg-blue-100 text-blue-700' :
                                  rating === 'good'        ? 'bg-slate-100 text-slate-700' :
                                  rating === 'adequate'    ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>{String(rating).charAt(0).toUpperCase() + String(rating).slice(1)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {[
                        { key: 'q5a_spiritual_growth',    label: '5a. Spiritual Growth & Maturity' },
                        { key: 'q5b_emotional_stability', label: '5b. Emotional Stability' },
                        { key: 'q5c_family_relationship', label: '5c. Family Relationship' },
                        { key: 'q6_moral_concern',        label: '6. Moral Life' },
                        { key: 'q7_fruitfulness',         label: '7. Fruitfulness' },
                      ].map(({ key, label }) => evalDetail[key] && (
                        <div key={key}>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                          <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{evalDetail[key]}</p>
                        </div>
                      ))}
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">8. Ordination Recommendation</p>
                        <p className={`text-sm font-black ${evalDetail.q8_recommendation ? 'text-green-700' : 'text-red-700'}`}>
                          {evalDetail.q8_recommendation ? '✓ Recommends for ordination' : '✕ Does not recommend for ordination'}
                        </p>
                        {evalDetail.q8_explanation && <p className="text-sm font-medium text-slate-700 mt-1 whitespace-pre-wrap">{evalDetail.q8_explanation}</p>}
                      </div>
                      {evalDetail.additional_comments && (
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Additional Comments</p>
                          <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{evalDetail.additional_comments}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 text-center font-medium py-8">Could not load evaluation response.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Self-assessment modal */}
          {saReq && (() => {
            const topic = saReq.requirement_templates?.topic as string
            const topicDef = SELF_ASSESSMENT_TOPICS[topic]
            const RATINGS = ['insufficient', 'adequate', 'good', 'excellent', 'exceptional']
            return (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Ordinand Self-Assessment</p>
                      <h3 className="text-xl font-black text-slate-900">{saReq.requirement_templates?.title}</h3>
                      <p className="text-sm text-slate-400 font-medium mt-1">{candidate.first_name} {candidate.last_name}</p>
                    </div>
                    <button onClick={() => setSaReq(null)} className="text-slate-300 hover:text-slate-500 text-2xl font-black leading-none">×</button>
                  </div>

                  <p className="text-xs text-slate-500 font-medium mb-6 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    Enter the ordinand&apos;s self-assessment responses as submitted in Moodle. For each section, record their rating and the evidence they cited from their paper.
                  </p>

                  <div className="space-y-6">
                    {/* Section 1: Completeness — per-question ratings */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                      <h4 className="text-sm font-black text-slate-800 mb-1">Completeness</h4>
                      <p className="text-xs text-slate-500 mb-4">Have you addressed each of the key questions as outlined in the assignment guide?</p>
                      {topicDef?.questions.map(q => (
                        <div key={q.id} className="mb-3">
                          <p className="text-xs text-slate-600 font-medium mb-1.5 leading-relaxed">{q.question}</p>
                          <select
                            value={saQuestionRatings[q.id] || ''}
                            onChange={e => setSaQuestionRatings(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none w-full"
                          >
                            <option value="">Select rating…</option>
                            {RATINGS.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                        </div>
                      ))}
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 mt-4">Evidence from their paper</label>
                      <textarea
                        value={saCompletenessEvidence}
                        onChange={e => setSaCompletenessEvidence(e.target.value)}
                        rows={3}
                        placeholder="Where and how does the paper address completeness?"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                      />
                    </div>

                    {/* Sections 2–6: single rating + evidence */}
                    {PAPER_SECTIONS.filter(s => s.id !== 'completeness').map(section => (
                      <div key={section.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                        <h4 className="text-sm font-black text-slate-800 mb-1">{section.title}</h4>
                        <p className="text-xs text-slate-500 mb-3 leading-relaxed">{section.prompt}</p>
                        <select
                          value={saRatings[section.id] || ''}
                          onChange={e => setSaRatings(prev => ({ ...prev, [section.id]: e.target.value }))}
                          className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none w-full mb-3"
                        >
                          <option value="">Select rating…</option>
                          {RATINGS.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Evidence from their paper</label>
                        <textarea
                          value={saEvidence[section.id] || ''}
                          onChange={e => setSaEvidence(prev => ({ ...prev, [section.id]: e.target.value }))}
                          rows={3}
                          placeholder="Where and how does the paper address this criterion?"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      onClick={handleSaveSelfAssessment}
                      disabled={isSavingSA}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {isSavingSA ? 'Saving…' : 'Save Self-Assessment'}
                    </button>
                    <button
                      onClick={() => setSaReq(null)}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Grade modal */}
          {selectedReq && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Grade Assignment</p>
                    <h3 className="text-xl font-black text-slate-900">{selectedReq.requirement_templates?.title}</h3>
                    <p className="text-sm text-slate-400 font-medium mt-1">{candidate.first_name} {candidate.last_name}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedReq(null); setRating(''); setComments(''); setModalGraderId(''); fetchData() }}
                    className="text-slate-400 hover:text-slate-700 font-black text-xl transition-colors"
                  >✕</button>
                </div>
                <div>
                  <label className={labelClass}>Graded By</label>
                  <select
                    className={inputClass}
                    value={modalGraderId}
                    onChange={e => setModalGraderId(e.target.value)}
                  >
                    <option value="">Select council member…</option>
                    {councilMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 font-medium mt-1">Required for migration. Leave blank to record as your own grade.</p>
                </div>
                <div>
                  <label className={labelClass}>Rating</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.keys(RATING_LABELS) as Rating[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setRating(r)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border-2 ${rating === r ? (r === 'insufficient' ? 'bg-red-500 text-white border-red-500' : 'bg-blue-600 text-white border-blue-600') : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                      >
                        {RATING_LABELS[r]}
                      </button>
                    ))}
                  </div>
                  {rating === 'insufficient' && <p className="text-xs text-red-500 font-bold mt-2">⚠ Insufficient will mark this as Revision Required</p>}
                  {rating && rating !== 'insufficient' && <p className="text-xs text-green-600 font-bold mt-2">✓ This rating will mark the assignment as Complete</p>}
                </div>
                <div>
                  <label className={labelClass}>Feedback Comments</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={4}
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Provide feedback for the ordinand…"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveGrade} disabled={!rating || isSaving} className={btnPrimary}>
                    {isSaving ? 'Saving…' : 'Save Grade'}
                  </button>
                  <button
                    onClick={() => { setSelectedReq(null); setRating(''); setComments(''); setModalGraderId(''); fetchData() }}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
