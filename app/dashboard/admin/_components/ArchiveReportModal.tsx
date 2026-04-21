// app/dashboard/admin/_components/ArchiveReportModal.tsx
// Archive report modal — generates completion summary + AI executive summary
// before archiving or completing an ordinand.
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../utils/supabase/client'
import { C, STATUS_CONFIG } from '../../../../lib/theme'
import ModalWrapper from '../../../components/ModalWrapper'

interface ArchiveReportModalProps {
  target: any // profile object
  mode: 'delete' | 'complete'
  onClose: () => void
  onArchive: () => void
  isArchiving: boolean
}

type Requirement = {
  id: string
  status: string
  requirement_templates: { title: string; type: string; display_order: number } | null
  submissions: { grades: { overall_rating: string; graded_at: string }[] }[] | null
}

export default function ArchiveReportModal({ target, mode, onClose, onArchive, isArchiving }: ArchiveReportModalProps) {
  const [step, setStep] = useState<'confirm' | 'report'>('confirm')
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  // Manual fields for the archive record
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewResult, setInterviewResult] = useState<'pass' | 'conditional' | 'fail' | ''>('')
  const [interviewNotes, setInterviewNotes] = useState('')
  const [ordinationDate, setOrdinationDate] = useState('')
  const [officiant, setOfficiant] = useState('')

  const summaryRef = useRef<HTMLDivElement>(null)

  async function fetchRequirements() {
    setLoadingReqs(true)
    const { data } = await supabase
      .from('ordinand_requirements')
      .select('id, status, requirement_templates(title, type, display_order), submissions(grades(overall_rating, graded_at))')
      .eq('ordinand_id', target.id)
      .order('requirement_templates(display_order)', { ascending: true } as any)
    setRequirements((data as any[]) || [])
    setLoadingReqs(false)
  }

  function handleGenerateReport() {
    setStep('report')
    fetchRequirements()
  }

  async function handleGenerateAI() {
    setIsGeneratingAI(true)
    setAiSummary('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAiSummary('Session expired — please refresh.'); setIsGeneratingAI(false); return }
    try {
      const res = await fetch('/api/admin/interview-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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

  // Group requirements by type
  const grouped = requirements.reduce<Record<string, Requirement[]>>((acc, req) => {
    const type = req.requirement_templates?.type ?? 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(req)
    return acc
  }, {})

  const totalCompleted = requirements.filter(r => r.status === 'complete' || r.status === 'graded').length
  const total = requirements.length

  const TYPE_LABELS: Record<string, string> = {
    book_report: 'Book Reports',
    paper: 'Theological Papers',
    sermon: 'Sermons',
  }

  function getGrade(req: Requirement): string {
    const subs = Array.isArray(req.submissions) ? req.submissions : []
    for (const sub of subs) {
      const grades = Array.isArray(sub.grades) ? sub.grades : []
      if (grades.length > 0 && grades[0].overall_rating) return grades[0].overall_rating
    }
    return '—'
  }

  function handleDownloadText() {
    let text = `ARCHIVE REPORT\n${target.first_name} ${target.last_name}\nGenerated: ${new Date().toLocaleDateString('en-CA')}\n\n`

    text += `COMPLETION SUMMARY: ${totalCompleted} of ${total} requirements completed\n`
    text += '─'.repeat(60) + '\n\n'

    for (const [type, reqs] of Object.entries(grouped)) {
      text += `${(TYPE_LABELS[type] || type).toUpperCase()}\n`
      for (const req of reqs) {
        const title = req.requirement_templates?.title ?? 'Unknown'
        const status = req.status
        const grade = getGrade(req)
        text += `  ${status === 'complete' || status === 'graded' ? '✓' : '○'} ${title} — ${status} ${grade !== '—' ? `(${grade})` : ''}\n`
      }
      text += '\n'
    }

    if (interviewDate || interviewResult || interviewNotes) {
      text += 'ORAL INTERVIEW\n'
      if (interviewDate) text += `  Date: ${interviewDate}\n`
      if (interviewResult) text += `  Result: ${interviewResult}\n`
      if (interviewNotes) text += `  Notes: ${interviewNotes}\n`
      text += '\n'
    }

    if (ordinationDate || officiant) {
      text += 'ORDINATION SERVICE\n'
      if (ordinationDate) text += `  Date: ${ordinationDate}\n`
      if (officiant) text += `  Officiant: ${officiant}\n`
      text += '\n'
    }

    if (aiSummary) {
      text += '─'.repeat(60) + '\n\n'
      text += 'AI EXECUTIVE SUMMARY\n\n'
      text += aiSummary + '\n\n'
      text += '(Confidential — for council records only. AI-generated from portal data.)\n'
    }

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `archive-report-${target.first_name}-${target.last_name}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
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
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>AI-generated executive summary of grades &amp; feedback</span></div>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>Oral interview date, result &amp; notes</span></div>
            <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>Ordination service date &amp; officiant</span></div>
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
            <button
              onClick={handleDownloadText}
              className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
              style={{ backgroundColor: C.deepSea }}
            >
              &darr; Download
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6" ref={summaryRef}>

        {/* Completion summary */}
        {loadingReqs ? (
          <div className="flex items-center gap-3 text-slate-400">
            <span className="animate-spin text-xl">⏳</span>
            <span className="font-medium text-sm">Loading requirements...</span>
          </div>
        ) : requirements.length > 0 ? (
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
                          {grade !== '—' && (
                            <span className="text-xs font-bold text-slate-400 capitalize">{grade}</span>
                          )}
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
        ) : null}

        {/* Manual fields */}
        {requirements.length > 0 && (
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
                <select value={interviewResult} onChange={e => setInterviewResult(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 bg-white">
                  <option value="">Not recorded</option>
                  <option value="pass">Pass</option>
                  <option value="conditional">Conditional</option>
                  <option value="fail">Fail</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Notes</label>
                <textarea value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                  placeholder="Optional interview notes..." />
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
        )}

        {/* AI executive summary */}
        {requirements.length > 0 && !aiSummary && !isGeneratingAI && (
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
                <span className="font-medium text-sm">Generating summary...</span>
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
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-slate-400 font-medium">
          Confidential — for district records only.
        </p>
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
            {isArchiving ? 'Processing...' : mode === 'delete' ? 'Delete Ordinand' : 'Mark Complete'}
          </button>
          <button onClick={() => setStep('confirm')} className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
            ← Back
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}
