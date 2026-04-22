// app/dashboard/council/interview/[id]/page.tsx
// Council Live Interview Console — the primary interface for council members during oral interviews.
// Features: read-only AI brief, question browser with highlight toggles, private scratchpad,
// 10-section scoring rubric, and post-submit locked view for debrief discussion.
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { C } from '../../../../../lib/theme'
import {
  INTERVIEW_SECTIONS,
  INTERVIEW_RATINGS,
  INTERVIEW_RATING_LABELS,
  getAllQuestions,
  type InterviewRating,
  type InterviewSection,
} from '../../../../../utils/interviewQuestions'

// ── Rating pill colours ─────────────────────────────────────────────────────
const RATING_STYLE: Record<InterviewRating, { active: string; idle: string }> = {
  insufficient: { active: 'bg-red-500 text-white border-red-500', idle: 'border-red-200 text-red-400 hover:border-red-300' },
  adequate:     { active: 'bg-amber-500 text-white border-amber-500', idle: 'border-amber-200 text-amber-400 hover:border-amber-300' },
  good:         { active: 'bg-blue-500 text-white border-blue-500', idle: 'border-blue-200 text-blue-400 hover:border-blue-300' },
  excellent:    { active: 'bg-green-500 text-white border-green-500', idle: 'border-green-200 text-green-400 hover:border-green-300' },
  exceptional:  { active: 'bg-purple-500 text-white border-purple-500', idle: 'border-purple-200 text-purple-400 hover:border-purple-300' },
}

type Tab = 'brief' | 'questions' | 'scoring'

export default function CouncilInterviewConsolePage() {
  const params = useParams<{ id: string }>()
  const interviewId = params?.id ?? ''
  const router = useRouter()

  // ── State ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interview, setInterview] = useState<any>(null)
  const [ordinand, setOrdinand] = useState<any>(null)
  const [userId, setUserId] = useState('')

  // Brief
  const [briefContent, setBriefContent] = useState('')

  // Questions — local-only highlight state
  const [highlightedQuestions, setHighlightedQuestions] = useState<Set<string>>(new Set())
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Section assignments
  const [sectionAssignments, setSectionAssignments] = useState<Record<string, string>>({})

  // Private notes — local only, never persisted
  const [privateNotes, setPrivateNotes] = useState('')

  // Scoring
  const [scores, setScores] = useState<Record<string, InterviewRating | ''>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Role
  const [isAdmin, setIsAdmin] = useState(false)

  // UI
  const [activeTab, setActiveTab] = useState<Tab>('brief')

  // ── Load data ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }
      setUserId(user.id)

      // Verify council or admin role
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()
      const roles: string[] = myProfile?.roles ?? []
      if (!roles.includes('council') && !roles.includes('admin')) {
        setError('You do not have permission to view this page.')
        setLoading(false)
        return
      }
      if (roles.includes('admin')) setIsAdmin(true)

      // Fetch interview
      const { data: iv, error: ivErr } = await supabase
        .from('oral_interviews')
        .select('*')
        .eq('id', interviewId)
        .single()
      if (ivErr || !iv) {
        setError('Interview not found.')
        setLoading(false)
        return
      }
      setInterview(iv)
      setBriefContent(iv.brief_snapshot || '')
      setSectionAssignments(iv.section_assignments || {})

      // Fetch ordinand
      const { data: ord } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, mentor_name')
        .eq('id', iv.ordinand_id)
        .single()
      setOrdinand(ord)

      // Fetch existing scores for this user
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const res = await fetch(`/api/council/interview-scores?interviewId=${interviewId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const json = await res.json()
          if (json.scores) {
            setScores(json.scores.scores || {})
            setIsSubmitted(!!json.scores.submitted_at)
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [interviewId, router])

  // ── Handlers ──────────────────────────────────────────────────────────

  function toggleHighlight(questionId: string) {
    setHighlightedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  function setRating(sectionId: string, rating: InterviewRating) {
    if (isSubmitted) return
    setScores(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === rating ? '' : rating,
    }))
  }

  const scoredCount = Object.values(scores).filter(v => v).length

  async function handleSaveScores(submit: boolean) {
    setIsSaving(true)
    setSaveError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaveError('Session expired'); setIsSaving(false); return }

    const res = await fetch('/api/council/interview-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ interviewId, scores, submit }),
    })

    if (res.ok) {
      if (submit) setIsSubmitted(true)
    } else {
      const err = await res.json().catch(() => ({}))
      setSaveError(err.error || 'Failed to save')
    }
    setIsSaving(false)
  }

  // ── Render helpers ────────────────────────────────────────────────────

  const candidateName = ordinand
    ? `${ordinand.first_name} ${ordinand.last_name}`.trim()
    : 'Unknown'

  const STATUS_BADGE: Record<string, { label: string; style: string }> = {
    scheduled:   { label: 'Scheduled',   style: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', style: 'bg-amber-100 text-amber-700' },
    decided:     { label: 'Decided',     style: 'bg-green-100 text-green-700' },
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'brief', label: 'AI Brief', icon: '📋' },
    { id: 'questions', label: 'Questions', icon: '❓' },
    { id: 'scoring', label: `Scoring (${scoredCount}/10)`, icon: '📊' },
  ]

  // ── Loading / Error ───────────────────────────────────────────────────

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
          <Link href="/dashboard/council" className="text-sm font-bold mt-3 inline-block" style={{ color: C.allianceBlue }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const statusCfg = STATUS_BADGE[interview.status] ?? STATUS_BADGE.scheduled

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/council"
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            ← Back
          </Link>
          <div className="h-5 w-px bg-slate-200 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-900 truncate">Interview Console — {candidateName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Link
              href={`/dashboard/admin/interview/${interviewId}`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
            >
              Chair Console →
            </Link>
          )}
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.style}`}>
            {statusCfg.label}
          </span>
          {isSubmitted && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
              ✓ Scores Submitted
            </span>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content area — two-panel: main content + private notes */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ height: 'calc(100vh - 105px)' }}>

        {/* Main panel */}
        <div className="flex-1 overflow-y-auto">

          {/* ── AI Brief tab ─────────────────────────────────────────── */}
          {activeTab === 'brief' && (
            <div className="p-5 sm:p-8">
              {briefContent ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">AI Interview Brief</p>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '0.825rem',
                    lineHeight: '1.75',
                    color: '#1e293b',
                  }}>
                    {briefContent}
                  </pre>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
                  <p className="text-slate-400 font-bold">No brief has been generated yet.</p>
                  <p className="text-slate-300 text-xs font-medium mt-1">The chair will generate the brief before the interview begins.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Questions tab ────────────────────────────────────────── */}
          {activeTab === 'questions' && (
            <div className="p-5 sm:p-8 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Interview Questions</p>
                <p className="text-xs text-slate-400 font-medium">
                  {highlightedQuestions.size > 0
                    ? `${highlightedQuestions.size} question${highlightedQuestions.size !== 1 ? 's' : ''} highlighted`
                    : 'Tap questions to highlight for your reference'}
                </p>
              </div>

              {INTERVIEW_SECTIONS.map(section => {
                const isExpanded = expandedSection === section.id
                const assignedTo = sectionAssignments[section.id]
                const isMySection = assignedTo === userId
                const sectionQuestionCount = getAllQuestions(section).length
                const highlightedInSection = getAllQuestions(section).filter(q => highlightedQuestions.has(q.id)).length

                return (
                  <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-black text-slate-700">{section.title}</span>
                        <span className="text-xs text-slate-400 font-medium shrink-0">{section.timeMinutes} min</span>
                        {isMySection && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 shrink-0">Your section</span>
                        )}
                        {highlightedInSection > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 shrink-0">
                            {highlightedInSection} highlighted
                          </span>
                        )}
                      </div>
                      <span className={`text-slate-400 font-bold transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4">
                        <p className="text-xs text-slate-500 font-medium italic">{section.objective}</p>

                        {/* Primary questions */}
                        <div>
                          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Primary Questions</p>
                          <div className="space-y-1.5">
                            {section.primaryQuestions.map((q, i) => (
                              <button
                                key={q.id}
                                onClick={() => toggleHighlight(q.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                                  highlightedQuestions.has(q.id)
                                    ? 'bg-amber-50 border-amber-300 text-slate-800'
                                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200'
                                }`}
                              >
                                <span className="text-blue-500 font-black mr-2">{i + 1}.</span>
                                {q.text}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Supplemental questions */}
                        {section.supplementalQuestions.length > 0 && (
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Supplemental Questions</p>
                            <div className="space-y-1.5">
                              {section.supplementalQuestions.map((q, i) => (
                                <button
                                  key={q.id}
                                  onClick={() => toggleHighlight(q.id)}
                                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                                    highlightedQuestions.has(q.id)
                                      ? 'bg-amber-50 border-amber-300 text-slate-800'
                                      : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                                  }`}
                                >
                                  <span className="text-slate-400 font-black mr-2">{i + 1}.</span>
                                  {q.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sub-sections */}
                        {section.subSections?.map(sub => (
                          <div key={sub.id}>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{sub.title}</p>
                            <div className="space-y-1.5">
                              {sub.questions.map((q, i) => (
                                <button
                                  key={q.id}
                                  onClick={() => toggleHighlight(q.id)}
                                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                                    highlightedQuestions.has(q.id)
                                      ? 'bg-amber-50 border-amber-300 text-slate-800'
                                      : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                                  }`}
                                >
                                  <span className="text-slate-400 font-black mr-2">{i + 1}.</span>
                                  {q.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Scoring tab ──────────────────────────────────────────── */}
          {activeTab === 'scoring' && (
            <div className="p-5 sm:p-8 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Score Each Section</p>
                <p className="text-xs font-bold text-slate-400">
                  {scoredCount} / {INTERVIEW_SECTIONS.length} sections rated
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(scoredCount / INTERVIEW_SECTIONS.length) * 100}%` }}
                />
              </div>

              {INTERVIEW_SECTIONS.map(section => {
                const currentRating = scores[section.id] || ''
                return (
                  <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-800">{section.title}</h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{section.timeMinutes} min · {section.objective.slice(0, 80)}…</p>
                      </div>
                      {currentRating && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${RATING_STYLE[currentRating as InterviewRating].active}`}>
                          {INTERVIEW_RATING_LABELS[currentRating as InterviewRating]}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {INTERVIEW_RATINGS.map(r => (
                        <button
                          key={r}
                          onClick={() => setRating(section.id, r)}
                          disabled={isSubmitted}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                            currentRating === r
                              ? RATING_STYLE[r].active
                              : isSubmitted
                              ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-default'
                              : `bg-white ${RATING_STYLE[r].idle}`
                          }`}
                        >
                          {INTERVIEW_RATING_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Submit / Save actions */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                {saveError && (
                  <p className="text-xs font-bold text-red-600 mb-3">{saveError}</p>
                )}
                {isSubmitted ? (
                  <div className="text-center py-2">
                    <p className="text-sm font-bold text-green-700">✓ Your scores have been submitted and locked.</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">Your notes and highlighted questions are still visible for the debrief discussion.</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleSaveScores(false)}
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      {isSaving ? 'Saving…' : '💾 Save Draft'}
                    </button>
                    <button
                      onClick={() => {
                        if (scoredCount < INTERVIEW_SECTIONS.length) {
                          if (!confirm(`You've scored ${scoredCount} of ${INTERVIEW_SECTIONS.length} sections. Submit anyway?`)) return
                        }
                        handleSaveScores(true)
                      }}
                      disabled={isSaving || scoredCount === 0}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                      style={{ backgroundColor: isSaving || scoredCount === 0 ? '#94a3b8' : C.deepSea }}
                    >
                      {isSaving ? 'Submitting…' : '🔒 Submit & Lock Scores'}
                    </button>
                    <p className="text-xs text-slate-400 font-medium self-center">
                      Once submitted, scores cannot be changed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — Private Notes (always visible) */}
        <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col shrink-0">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Private Notes</p>
            <p className="text-xs text-slate-300 font-medium mt-0.5">Local only — not saved or shared</p>
          </div>
          <div className="flex-1 p-3">
            <textarea
              value={privateNotes}
              onChange={e => setPrivateNotes(e.target.value)}
              className="w-full h-full px-4 py-3 text-sm font-medium text-slate-700 border border-slate-200 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Your private notes for this interview…&#10;&#10;These stay in your browser and are never sent to the server."
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: '1.75' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
