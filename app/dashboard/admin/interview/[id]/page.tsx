// app/dashboard/admin/interview/[id]/page.tsx
// Interview Console — dedicated view for conducting an oral interview.
// Left panel: AI interview brief (generate/stream). Right panel: live notes + decision recording.
'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { C } from '../../../../../lib/theme'
import { inputClass } from '../../../../../lib/formStyles'
import ModalWrapper from '../../../../components/ModalWrapper'
import {
  INTERVIEW_SECTIONS,
  INTERVIEW_RATINGS,
  INTERVIEW_RATING_LABELS,
  type InterviewRating,
} from '../../../../../utils/interviewQuestions'

// Rating pill styles for the decision modal scoring grid
const RATING_STYLE: Record<InterviewRating, { active: string; idle: string }> = {
  insufficient: { active: 'bg-red-500 text-white border-red-500', idle: 'border-red-200 text-red-400 hover:border-red-300' },
  adequate:     { active: 'bg-amber-500 text-white border-amber-500', idle: 'border-amber-200 text-amber-400 hover:border-amber-300' },
  good:         { active: 'bg-blue-500 text-white border-blue-500', idle: 'border-blue-200 text-blue-400 hover:border-blue-300' },
  excellent:    { active: 'bg-green-500 text-white border-green-500', idle: 'border-green-200 text-green-400 hover:border-green-300' },
  exceptional:  { active: 'bg-purple-500 text-white border-purple-500', idle: 'border-purple-200 text-purple-400 hover:border-purple-300' },
}

interface Interview {
  id: string
  ordinand_id: string
  scheduled_date: string | null
  interview_date: string | null
  status: string
  result: string | null
  council_present: string[]
  notes: string
  decision_notes: string
  brief_snapshot: string
  conducted_by: string | null
  ordination_date: string | null
  officiant: string
  ordinand?: {
    id: string
    first_name: string
    last_name: string
    email: string
    mentor_name: string | null
    cohort_id: string | null
    cohorts?: { year: number; season: string; sermon_topic: string } | null
  }
  conducted_by_profile?: { id: string; first_name: string; last_name: string } | null
}

const RESULT_OPTIONS = [
  { value: 'sustained',     label: 'Sustained',               colour: 'bg-green-50 border-green-300 text-green-800' },
  { value: 'conditional',   label: 'Conditionally Sustained',  colour: 'bg-blue-50 border-blue-300 text-blue-800' },
  { value: 'deferred',      label: 'Deferred',                colour: 'bg-amber-50 border-amber-300 text-amber-800' },
  { value: 'not_sustained', label: 'Not Sustained',            colour: 'bg-red-50 border-red-300 text-red-800' },
]

export default function InterviewConsolePage() {
  const params = useParams<{ id: string }>()
  const interviewId = params?.id ?? ''
  const router = useRouter()

  const [interview, setInterview] = useState<Interview | null>(null)
  const [councilMembers, setCouncilMembers] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Brief state
  const [briefContent, setBriefContent] = useState('')
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false)

  // Notes state (auto-saved)
  const [notes, setNotes] = useState('')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Section assignments state
  const [sectionAssignments, setSectionAssignments] = useState<Record<string, string>>({})
  const [assignSaveStatus, setAssignSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Decision state
  const [showDecision, setShowDecision] = useState(false)
  const [result, setResult] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [ordinationDate, setOrdinationDate] = useState('')
  const [officiant, setOfficiant] = useState('')
  const [selectedCouncil, setSelectedCouncil] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  // Final scores state — official consensus grades per section
  const [finalScores, setFinalScores] = useState<Record<string, InterviewRating | ''>>({})
  const [aggregateHints, setAggregateHints] = useState<Record<string, string | null>>({})

  // Conditions (conditional / deferred outcomes)
  const [conditions, setConditions] = useState('')

  // ── Fetch interview + council ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }

      const [ivRes, cmRes] = await Promise.all([
        fetch(`/api/admin/interviews/${interviewId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        supabase.from('profiles').select('id, first_name, last_name').contains('roles', ['council']),
      ])

      if (!ivRes.ok) { setError('Interview not found'); setLoading(false); return }
      const { interview: iv } = await ivRes.json()
      setInterview(iv)
      setNotes(iv.notes || '')
      setDecisionNotes(iv.decision_notes || '')
      setBriefContent(iv.brief_snapshot || '')
      setInterviewDate(iv.interview_date || iv.scheduled_date || '')
      setOrdinationDate(iv.ordination_date || '')
      setOfficiant(iv.officiant || '')
      setResult(iv.result || '')
      setSelectedCouncil(new Set(iv.council_present || []))
      setSectionAssignments(iv.section_assignments || {})
      setFinalScores(iv.final_scores || {})
      setConditions(iv.conditions || '')
      setCouncilMembers(cmRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [interviewId, router])

  // ── Auto-save notes ────────────────────────────────────────────────
  const autoSave = useCallback(async (field: 'notes' | 'decision_notes', value: string) => {
    setSaveStatus('saving')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaveStatus('error'); return }

    const res = await fetch(`/api/admin/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ [field]: value }),
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
  }, [interviewId])

  function handleNotesChange(value: string) {
    setNotes(value)
    setSaveStatus('unsaved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => autoSave('notes', value), 1500)
  }

  function handleDecisionNotesChange(value: string) {
    setDecisionNotes(value)
    setSaveStatus('unsaved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => autoSave('decision_notes', value), 1500)
  }

  // ── Generate AI brief ──────────────────────────────────────────────
  async function handleGenerateBrief() {
    if (!interview) return
    setIsGeneratingBrief(true)
    setBriefContent('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBriefContent('Session expired.'); setIsGeneratingBrief(false); return }

    try {
      const res = await fetch('/api/admin/interview-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ordinandId: interview.ordinand_id }),
      })
      if (!res.ok || !res.body) { setBriefContent('Error generating brief.'); setIsGeneratingBrief(false); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setBriefContent(prev => prev + chunk)
      }

      // Snapshot the brief onto the interview record
      await fetch(`/api/admin/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brief_snapshot: fullText }),
      })
    } catch {
      setBriefContent('Error generating brief — please try again.')
    }
    setIsGeneratingBrief(false)
  }

  // ── Start interview (transition to in_progress) ────────────────────
  async function handleStartInterview() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/admin/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ status: 'in_progress', interview_date: new Date().toISOString().slice(0, 10) }),
    })
    if (res.ok) {
      const { interview: updated } = await res.json()
      setInterview(updated)
      setInterviewDate(updated.interview_date || '')
    }
  }

  // ── Open decision modal + pre-populate from aggregate ────────────────
  async function openDecisionModal() {
    setShowDecision(true)
    // Fetch aggregate to pre-populate final scores from council averages
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch(`/api/admin/interview-scores-aggregate?interviewId=${interviewId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const agg = await res.json()
        const hints: Record<string, string | null> = {}
        const prePopulated: Record<string, InterviewRating | ''> = { ...finalScores }
        for (const section of INTERVIEW_SECTIONS) {
          const sectionAgg = agg.sections?.[section.id]
          hints[section.id] = sectionAgg?.averageRating ?? null
          // Only pre-populate if not already set
          if (!prePopulated[section.id] && sectionAgg?.averageRating) {
            prePopulated[section.id] = sectionAgg.averageRating as InterviewRating
          }
        }
        setAggregateHints(hints)
        setFinalScores(prePopulated)
      }
    } catch { /* aggregate hint is optional — proceed without it */ }
  }

  // ── Record decision ────────────────────────────────────────────────
  async function handleRecordDecision() {
    if (!result) return
    setIsSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setIsSaving(false); return }

    const res = await fetch(`/api/admin/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        status: 'decided',
        result,
        interview_date: interviewDate || null,
        decision_notes: decisionNotes,
        council_present: Array.from(selectedCouncil),
        final_scores: finalScores,
        conditions: conditions || '',
      }),
    })
    if (res.ok) {
      const { interview: updated } = await res.json()
      setInterview(updated)
      setShowDecision(false)
    }
    setIsSaving(false)
  }

  // ── Toggle council attendance (auto-saves) ─────────────────────────
  function toggleCouncil(id: string) {
    setSelectedCouncil(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveCouncilPresent(Array.from(next))
      return next
    })
  }

  async function saveCouncilPresent(ids: string[]) {
    setSaveStatus('saving')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaveStatus('error'); return }

    const res = await fetch(`/api/admin/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ council_present: ids }),
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
  }

  // ── Save section assignments ────────────────────────────────────────
  async function saveSectionAssignments(updated: Record<string, string>) {
    setAssignSaveStatus('saving')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAssignSaveStatus('idle'); return }

    const res = await fetch(`/api/admin/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ section_assignments: updated }),
    })
    setAssignSaveStatus(res.ok ? 'saved' : 'idle')
    if (res.ok) setTimeout(() => setAssignSaveStatus('idle'), 2000)
  }

  function handleAssignSection(sectionId: string, memberId: string) {
    const updated = { ...sectionAssignments }
    if (memberId === '') {
      delete updated[sectionId]
    } else {
      updated[sectionId] = memberId
    }
    setSectionAssignments(updated)
    saveSectionAssignments(updated)
  }

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="animate-spin text-2xl">⏳</span>
          <span className="font-bold">Loading interview console…</span>
        </div>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 font-bold text-lg">{error || 'Interview not found'}</p>
          <Link href="/dashboard/admin" className="text-sm font-bold mt-3 inline-block" style={{ color: C.allianceBlue }}>
            ← Back to Admin
          </Link>
        </div>
      </div>
    )
  }

  const ord = interview.ordinand
  const candidateName = ord ? `${ord.first_name} ${ord.last_name}` : 'Unknown'
  const isDecided = interview.status === 'decided'
  const isActive = interview.status === 'in_progress'
  const isScheduled = interview.status === 'scheduled'

  const SAVE_INDICATORS: Record<string, { text: string; colour: string }> = {
    saved:   { text: '✓ Saved',  colour: 'text-green-500' },
    saving:  { text: 'Saving…',  colour: 'text-slate-400' },
    unsaved: { text: '●',        colour: 'text-amber-500' },
    error:   { text: '✕ Error',  colour: 'text-red-500' },
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/admin/candidates/${interview.ordinand_id}`}
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← {candidateName}
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <h1 className="text-base font-black text-slate-900">Interview Console</h1>
          {ord?.cohorts && (
            <span className="text-xs font-bold text-slate-400">
              {ord.cohorts.year} {ord.cohorts.season} · {ord.cohorts.sermon_topic?.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold ${SAVE_INDICATORS[saveStatus].colour}`}>
            {SAVE_INDICATORS[saveStatus].text}
          </span>
          {isScheduled && (
            <button
              onClick={handleStartInterview}
              className="px-5 py-2 text-white rounded-xl text-sm font-bold transition-all"
              style={{ backgroundColor: '#d97706' }}
            >
              🎙️ Begin Interview
            </button>
          )}
          {(isActive || isDecided) && (
            <>
              <Link
                href={`/dashboard/council/interview/${interviewId}`}
                target="_blank"
                className="px-4 py-2 rounded-xl text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
              >
                ✏️ My Scores
              </Link>
              <button
                onClick={() => window.open(`/dashboard/admin/interview/${interviewId}/aggregate`, 'aggregate', 'width=1200,height=900')}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                📊 Aggregate View
              </button>
            </>
          )}
          {isActive && (
            <button
              onClick={openDecisionModal}
              className="px-5 py-2 text-white rounded-xl text-sm font-bold transition-all"
              style={{ backgroundColor: C.deepSea }}
            >
              ✅ Record Decision
            </button>
          )}
          {isDecided && interview.result && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${RESULT_OPTIONS.find(r => r.value === interview.result)?.colour ?? ''}`}>
              {RESULT_OPTIONS.find(r => r.value === interview.result)?.label}
            </span>
          )}
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-0 lg:gap-0" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Left panel — AI Brief */}
        <div className="lg:w-1/2 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Interview Brief</p>
            <button
              onClick={handleGenerateBrief}
              disabled={isGeneratingBrief}
              className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
              style={{ backgroundColor: isGeneratingBrief ? '#94a3b8' : C.allianceBlue }}
            >
              {isGeneratingBrief ? '⏳ Generating…' : briefContent ? '🔄 Regenerate' : '✨ Generate Brief'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!briefContent && !isGeneratingBrief && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-400 font-bold text-sm">No brief generated yet.</p>
                  <p className="text-slate-300 text-xs font-medium mt-1">
                    Click &quot;Generate Brief&quot; to create an AI-synthesized interview preparation document.
                  </p>
                </div>
              </div>
            )}
            {isGeneratingBrief && !briefContent && (
              <div className="flex items-center gap-3 text-slate-400">
                <span className="animate-spin text-xl">⏳</span>
                <span className="font-medium text-sm">Gathering data and composing brief…</span>
              </div>
            )}
            {briefContent && (
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '0.825rem',
                lineHeight: '1.75',
                color: '#1e293b',
              }}>
                {briefContent}
                {isGeneratingBrief && <span className="animate-pulse">▍</span>}
              </pre>
            )}
          </div>
        </div>

        {/* Right panel — Notes + Decision */}
        <div className="lg:w-1/2 flex flex-col bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Interview Notes</p>
            <p className="text-xs text-slate-300 font-medium mt-0.5">Notes auto-save as you type. Visible only to admins.</p>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Main notes area */}
            <div className="flex-1 p-4">
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                readOnly={isDecided}
                className="w-full h-full px-4 py-3 text-sm font-medium text-slate-700 border border-slate-200 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Type interview notes here…&#10;&#10;Topics discussed, candidate responses, observations, follow-up items…"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: '1.75' }}
              />
            </div>

            {/* Council attendance */}
            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Council Present</p>
              <div className="flex flex-wrap gap-2">
                {councilMembers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { if (!isDecided) toggleCouncil(m.id) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedCouncil.has(m.id)
                        ? 'bg-[#0077C8] text-white border-[#0077C8]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'
                    } ${isDecided ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {m.first_name} {m.last_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Section assignments — assign question groups to council members */}
            {(isActive || isScheduled) && councilMembers.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Section Assignments</p>
                  {assignSaveStatus === 'saving' && <span className="text-xs text-slate-400 font-medium">Saving…</span>}
                  {assignSaveStatus === 'saved' && <span className="text-xs text-green-500 font-bold">✓ Saved</span>}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {INTERVIEW_SECTIONS.map(section => (
                    <div key={section.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600 w-36 truncate flex-shrink-0" title={section.title}>
                        {section.title}
                      </span>
                      <select
                        value={sectionAssignments[section.id] || ''}
                        onChange={e => handleAssignSection(section.id, e.target.value)}
                        className="flex-1 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                      >
                        <option value="">— unassigned —</option>
                        {councilMembers.filter(m => selectedCouncil.has(m.id)).map(m => (
                          <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-300 font-medium mt-2">Assigns which council member leads each question group. Only present members shown.</p>
              </div>
            )}

            {/* Decision summary (shown after decided) */}
            {isDecided && (
              <>
                {/* Conditions (conditional / deferred) */}
                {conditions && (
                  <div className="px-6 py-4 border-t border-amber-100 flex-shrink-0 bg-amber-50/30">
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2">
                      {interview.result === 'deferred' ? 'Conditions for Reinstatement' : 'Conditions for Ordination'}
                    </p>
                    <pre className="text-sm text-amber-900 font-medium whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                      {conditions}
                    </pre>
                  </div>
                )}

                <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Deliberation Notes</p>
                  <pre className="text-sm text-slate-600 font-medium whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                    {decisionNotes || '(No deliberation notes recorded)'}
                  </pre>
                </div>

                {/* Final grades */}
                {Object.keys(finalScores).length > 0 && (
                  <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Official Section Grades</p>
                    <div className="space-y-1.5">
                      {INTERVIEW_SECTIONS.map(section => {
                        const grade = finalScores[section.id]
                        if (!grade) return null
                        return (
                          <div key={section.id} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 w-36 flex-shrink-0">{section.title}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${RATING_STYLE[grade as InterviewRating]?.active ?? 'text-slate-500'}`}>
                              {INTERVIEW_RATING_LABELS[grade as InterviewRating] ?? grade}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* PDF download */}
                <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                  <button
                    onClick={async () => {
                      const { generateDecisionPDF } = await import('../../../../../utils/generateDecisionPDF')
                      await generateDecisionPDF({
                        candidateName,
                        cohortLabel: ord?.cohorts ? `${ord.cohorts.season} ${ord.cohorts.year} Cohort` : undefined,
                        interviewDate: interviewDate || '',
                        result: interview.result || '',
                        resultLabel: RESULT_OPTIONS.find(r => r.value === interview.result)?.label || '',
                        councilPresent: councilMembers
                          .filter(m => selectedCouncil.has(m.id))
                          .map(m => `${m.first_name} ${m.last_name}`),
                        finalScores: finalScores as Record<string, string>,
                        conditions: conditions || undefined,
                        decisionNotes: decisionNotes || undefined,
                      })
                    }}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    ↓ Download Decision Record (PDF)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Decision modal */}
      {showDecision && (
        <ModalWrapper onClose={() => setShowDecision(false)} ariaLabel="Record interview decision" maxWidth="max-w-3xl">
          <div className="p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-lg font-black text-slate-900">Record Decision</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Document the council&apos;s decision and official grades for {candidateName}.
              </p>
            </div>

            {/* Result selection */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">Outcome *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RESULT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setResult(opt.value)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                      result === opt.value ? opt.colour + ' border-current' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditions — shown for conditional / deferred outcomes */}
            {(result === 'conditional' || result === 'deferred') && (
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  {result === 'deferred' ? 'Conditions for Reinstatement *' : 'Conditions for Ordination *'}
                </label>
                <p className="text-xs text-slate-400 font-medium mb-2">
                  {result === 'deferred'
                    ? 'What must the ordinand complete or demonstrate before the council will reconsider?'
                    : 'What specific requirements must be fulfilled before ordination can proceed?'}
                </p>
                <textarea
                  value={conditions}
                  onChange={e => setConditions(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-amber-200 bg-amber-50/50 rounded-xl outline-none focus:ring-2 focus:ring-amber-100 resize-none"
                  placeholder="e.g., Complete revised paper on Sanctification by Sept 30…"
                />
              </div>
            )}

            {/* Final scores — official consensus grades */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Official Section Grades</label>
              <p className="text-xs text-slate-400 font-medium mb-3">
                Record the council&apos;s consensus grade for each interview section.
                {Object.keys(aggregateHints).length > 0 && ' Pre-populated from the aggregate — adjust as needed.'}
              </p>
              <div className="space-y-2.5">
                {INTERVIEW_SECTIONS.map(section => {
                  const current = finalScores[section.id] || ''
                  const hint = aggregateHints[section.id]
                  return (
                    <div key={section.id} className="flex items-center gap-3">
                      <div className="w-36 flex-shrink-0">
                        <span className="text-xs font-bold text-slate-600 leading-tight">{section.title}</span>
                        {hint && current !== hint && (
                          <span className="text-[10px] text-slate-400 font-medium block">avg: {INTERVIEW_RATING_LABELS[hint as InterviewRating]}</span>
                        )}
                      </div>
                      <div className="flex gap-1 flex-1">
                        {INTERVIEW_RATINGS.map(rating => (
                          <button
                            key={rating}
                            onClick={() => setFinalScores(prev => ({
                              ...prev,
                              [section.id]: prev[section.id] === rating ? '' : rating,
                            }))}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all flex-1 ${
                              current === rating ? RATING_STYLE[rating].active : RATING_STYLE[rating].idle
                            }`}
                          >
                            {INTERVIEW_RATING_LABELS[rating]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Date + council attendance summary */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Interview Date</label>
                <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Council Present</label>
                <p className="text-sm font-medium text-slate-700 py-2">{selectedCouncil.size} member{selectedCouncil.size !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Deliberation notes */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Deliberation Notes</label>
              <textarea
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                placeholder="Council feedback, conditions, rationale…"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRecordDecision}
                disabled={!result || isSaving}
                className="px-6 py-2.5 text-white rounded-xl text-sm font-bold transition-all"
                style={{ backgroundColor: !result || isSaving ? '#94a3b8' : C.deepSea, cursor: !result ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? 'Saving…' : 'Confirm Decision'}
              </button>
              <button
                onClick={() => setShowDecision(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  )
}
