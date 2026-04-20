// _components/InterviewBriefSection.tsx
// AI Interview Brief card + streaming modal — extracted from candidates/[id]/page.tsx
'use client'
import { useState } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { generateBriefPDF } from '../../../../../../utils/generateBriefPDF'

interface InterviewBriefSectionProps {
  candidate: any
  ordinandId: string
}

export default function InterviewBriefSection({ candidate, ordinandId }: InterviewBriefSectionProps) {
  const [showBrief, setShowBrief] = useState(false)
  const [briefContent, setBriefContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setShowBrief(true)
    setBriefContent('')
    setIsGenerating(true)
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
        setBriefContent(prev => prev + decoder.decode(value, { stream: true }))
      }
    } catch {
      setBriefContent('Error generating brief — please try again.')
    }
    setIsGenerating(false)
  }

  async function handleDownloadPDF() {
    await generateBriefPDF(candidate, briefContent)
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
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all flex-shrink-0"
            style={{ backgroundColor: isGenerating ? '#94a3b8' : '#00426A' }}
          >
            {isGenerating ? '\u23F3 Generating\u2026' : '\u2728 Generate Brief'}
          </button>
        </div>
        <div className="px-8 py-4 text-xs text-slate-400 font-medium leading-relaxed">
          Use this before an oral interview. The brief draws on all available data — the more complete the record, the richer the output. It does not make a pass/fail recommendation; it helps the council have a more informed, personal conversation.
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
              <div className="flex items-center gap-3">
                {briefContent && !isGenerating && (
                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
                    style={{ backgroundColor: '#00426A' }}
                  >
                    &darr; Download PDF
                  </button>
                )}
                <button
                  onClick={() => setShowBrief(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-all text-lg font-bold"
                >
                  &times;
                </button>
              </div>
            </div>
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
