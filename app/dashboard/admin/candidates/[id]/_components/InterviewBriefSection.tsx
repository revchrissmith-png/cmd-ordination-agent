// _components/InterviewBriefSection.tsx
// AI Interview Brief card + streaming modal + email + PDF download
// Persists the generated brief to the interview record's brief_snapshot so the
// interview console and council console can display it without regeneration.
'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { generateBriefPDF } from '../../../../../../utils/generateBriefPDF'

interface InterviewBriefSectionProps {
  candidate: any
  ordinandId: string
  councilMembers?: { id: string; full_name: string; email: string }[]
}

export default function InterviewBriefSection({ candidate, ordinandId, councilMembers = [] }: InterviewBriefSectionProps) {
  const [showBrief, setShowBrief] = useState(false)
  const [briefContent, setBriefContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasSavedBrief, setHasSavedBrief] = useState(false)

  // The interview ID we'll save the brief to
  const [interviewId, setInterviewId] = useState<string | null>(null)

  // Email state
  const [showEmailPanel, setShowEmailPanel] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState<Set<string>>(new Set())
  const [customEmail, setCustomEmail] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Track the full text during streaming so we can save it at the end
  const fullTextRef = useRef('')

  // ── On mount: find the most recent non-cancelled interview and load its brief_snapshot ──
  useEffect(() => {
    async function loadExistingBrief() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Find the most recent non-cancelled interview for this ordinand
      const { data: interviews } = await supabase
        .from('oral_interviews')
        .select('id, brief_snapshot, status, scheduled_date')
        .eq('ordinand_id', ordinandId)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: false })
        .limit(1)

      if (interviews && interviews.length > 0) {
        const iv = interviews[0]
        setInterviewId(iv.id)
        if (iv.brief_snapshot) {
          setBriefContent(iv.brief_snapshot)
          fullTextRef.current = iv.brief_snapshot
          setHasSavedBrief(true)
        }
      }
    }
    loadExistingBrief()
  }, [ordinandId])

  // ── Save brief to interview record ──
  async function saveBriefToInterview(text: string) {
    if (!interviewId) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch(`/api/admin/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ brief_snapshot: text }),
    })
    setHasSavedBrief(true)
  }

  async function handleGenerate() {
    setShowBrief(true)
    setBriefContent('')
    fullTextRef.current = ''
    setIsGenerating(true)
    setShowEmailPanel(false)
    setEmailStatus(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBriefContent('Session expired — please refresh the page.'); setIsGenerating(false); return }
    try {
      const res = await fetch('/api/admin/interview-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ ordinandId }),
      })
      if (!res.ok || !res.body) { setBriefContent('Error generating brief — please try again.'); setIsGenerating(false); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullTextRef.current += chunk
        setBriefContent(prev => prev + chunk)
      }

      // Save to the interview record so the console and council can read it
      await saveBriefToInterview(fullTextRef.current)
    } catch {
      setBriefContent('Error generating brief — please try again.')
    }
    setIsGenerating(false)
  }

  function handleViewSaved() {
    setShowBrief(true)
    setShowEmailPanel(false)
    setEmailStatus(null)
  }

  async function handleDownloadPDF() {
    await generateBriefPDF(candidate, briefContent)
  }

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
    if (!session) { setEmailStatus({ type: 'error', text: 'Session expired — please refresh.' }); setIsSendingEmail(false); return }

    const recipients = Array.from(emailRecipients).map(email => {
      const member = councilMembers.find(m => m.email === email)
      return member ? { email, name: member.full_name } : { email }
    })

    try {
      const res = await fetch('/api/admin/email-interview-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          briefText: briefContent,
          candidateName: `${candidate.first_name} ${candidate.last_name}`,
          recipients,
        }),
      })
      const data = await res.json()
      if (data.sent) {
        setEmailStatus({ type: 'success', text: `Brief sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}` })
        setShowEmailPanel(false)
      } else {
        setEmailStatus({ type: 'error', text: data.reason || 'Failed to send email' })
      }
    } catch {
      setEmailStatus({ type: 'error', text: 'Network error — check your connection' })
    }
    setIsSendingEmail(false)
  }

  return (
    <>
      {/* AI Interview Brief card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Interview Brief</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Synthesizes grades, feedback, self-assessments, Pardington sessions, and evaluations into a council-ready briefing document.
            </p>
            {hasSavedBrief && (
              <p className="text-xs text-green-600 font-bold mt-1">
                ✓ Brief saved — will appear on the interview console and council view.
              </p>
            )}
            {!interviewId && (
              <p className="text-xs text-amber-500 font-medium mt-1">
                No interview scheduled — brief will not be saved until an interview is created.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasSavedBrief && (
              <button
                onClick={handleViewSaved}
                className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                View Brief
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all"
              style={{ backgroundColor: isGenerating ? '#94a3b8' : '#00426A' }}
            >
              {isGenerating ? '\u23F3 Generating\u2026' : hasSavedBrief ? '\u{1F504} Regenerate' : '\u2728 Generate Brief'}
            </button>
          </div>
        </div>
        <div className="px-8 py-4 text-xs text-slate-400 font-medium leading-relaxed">
          {hasSavedBrief
            ? 'A brief has been generated and saved. It will appear automatically on the interview console and each council member\u2019s live view. Regenerating will overwrite the saved version.'
            : 'Use this before an oral interview. The brief draws on all available data \u2014 the more complete the record, the richer the output. It does not make a pass/fail recommendation; it helps the council have a more informed, personal conversation.'}
        </div>
      </div>

      {/* Brief modal */}
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
              <div className="flex items-center gap-2">
                {briefContent && !isGenerating && (
                  <>
                    <button
                      onClick={handleGenerate}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      {'\u{1F504}'} Regenerate
                    </button>
                    <button
                      onClick={() => { setShowEmailPanel(!showEmailPanel); setEmailStatus(null) }}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
                      style={{
                        backgroundColor: showEmailPanel ? '#f0f7ff' : 'transparent',
                        borderColor: showEmailPanel ? '#0077C8' : '#e2e8f0',
                        color: showEmailPanel ? '#0077C8' : '#64748b',
                      }}
                    >
                      {'\u2709'} Email
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
                      style={{ backgroundColor: '#00426A' }}
                    >
                      &darr; PDF
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowBrief(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-all text-lg font-bold"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Email panel */}
            {showEmailPanel && (
              <div className="px-8 py-4 bg-blue-50/50 border-b border-blue-100 flex-shrink-0">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Send brief to</p>

                {/* Council member checkboxes */}
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
                        {m.full_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom email input */}
                <div className="flex gap-2 items-center mb-3">
                  <input
                    type="email"
                    placeholder="Add email address..."
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomRecipient() } }}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={addCustomRecipient}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                  >
                    Add
                  </button>
                </div>

                {/* Selected count + send */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    {emailRecipients.size === 0 ? 'Select at least one recipient' : `${emailRecipients.size} recipient${emailRecipients.size > 1 ? 's' : ''} selected`}
                  </span>
                  <button
                    onClick={handleSendEmail}
                    disabled={emailRecipients.size === 0 || isSendingEmail}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
                    style={{ backgroundColor: emailRecipients.size === 0 || isSendingEmail ? '#94a3b8' : '#0077C8', cursor: emailRecipients.size === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    {isSendingEmail ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            )}

            {/* Email status message */}
            {emailStatus && (
              <div className={`px-8 py-2.5 text-xs font-bold flex-shrink-0 ${emailStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {emailStatus.text}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-8 py-6">
              {isGenerating && briefContent === '' && (
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="animate-spin text-xl">{'\u23F3'}</span>
                  <span className="font-medium text-sm">Gathering data and composing brief...</span>
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
                  {isGenerating && <span className="animate-pulse">{'\u258D'}</span>}
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
    </>
  )
}
