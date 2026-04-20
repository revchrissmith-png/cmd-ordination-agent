// _components/SelfAssessmentModal.tsx
// Paper self-assessment entry modal — extracted from candidates/[id]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { SELF_ASSESSMENT_TOPICS, PAPER_SECTIONS } from '../../../../../../utils/selfAssessmentQuestions'
import ModalWrapper from '../../../../../components/ModalWrapper'

const RATINGS = ['insufficient', 'adequate', 'good', 'excellent', 'exceptional']

interface SelfAssessmentModalProps {
  req: any
  candidate: any
  isObserver: boolean
  onClose: () => void
  onSaved: () => void
  flash: (text: string, type: 'success' | 'error') => void
}

export default function SelfAssessmentModal({ req, candidate, isObserver, onClose, onSaved, flash }: SelfAssessmentModalProps) {
  const [questionRatings, setQuestionRatings] = useState<Record<string, string>>({})
  const [completenessEvidence, setCompletenessEvidence] = useState('')
  const [ratings, setRatings] = useState<Record<string, string>>({})
  const [evidence, setEvidence] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Initialize state from existing self-assessment data
  useEffect(() => {
    const submission = Array.isArray(req.submissions) ? req.submissions[0] : req.submissions
    if (submission?.self_assessment?.version === 2) {
      const s = submission.self_assessment.sections || {}
      setQuestionRatings(s.completeness?.question_ratings || {})
      setCompletenessEvidence(s.completeness?.evidence || '')
      const r: Record<string, string> = {}
      const e: Record<string, string> = {}
      PAPER_SECTIONS.filter(p => p.id !== 'completeness').forEach(section => {
        r[section.id] = s[section.id]?.rating || ''
        e[section.id] = s[section.id]?.evidence || ''
      })
      setRatings(r)
      setEvidence(e)
    } else {
      setQuestionRatings({})
      setCompletenessEvidence('')
      setRatings({})
      setEvidence({})
    }
  }, [req])

  async function handleSave() {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return }
    const submission = Array.isArray(req.submissions) ? req.submissions[0] : req.submissions
    if (!submission?.id) { flash('No submission found — upload the file first.', 'error'); return }
    setIsSaving(true)
    const sectionData: Record<string, any> = {
      completeness: { question_ratings: questionRatings, evidence: completenessEvidence },
    }
    PAPER_SECTIONS.filter(s => s.id !== 'completeness').forEach(section => {
      sectionData[section.id] = { rating: ratings[section.id] || '', evidence: evidence[section.id] || '' }
    })
    const { error } = await supabase
      .from('submissions')
      .update({ self_assessment: { version: 2, sections: sectionData } })
      .eq('id', submission.id)
    if (error) {
      flash('Failed to save self-assessment: ' + error.message, 'error')
    } else {
      flash('Self-assessment saved', 'success')
      onSaved()
    }
    setIsSaving(false)
  }

  const topic = req.requirement_templates?.topic as string
  const topicDef = SELF_ASSESSMENT_TOPICS[topic]

  return (
    <ModalWrapper onClose={onClose} ariaLabel="Ordinand self-assessment" maxWidth="max-w-2xl" innerClassName="max-h-[90vh] overflow-y-auto p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Ordinand Self-Assessment</p>
            <h3 className="text-xl font-black text-slate-900">{req.requirement_templates?.title}</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">{candidate.first_name} {candidate.last_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-2xl font-black leading-none">&times;</button>
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
                  value={questionRatings[q.id] || ''}
                  onChange={e => setQuestionRatings(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none w-full"
                >
                  <option value="">Select rating...</option>
                  {RATINGS.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            ))}
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 mt-4">Evidence from their paper</label>
            <textarea
              value={completenessEvidence}
              onChange={e => setCompletenessEvidence(e.target.value)}
              rows={3}
              placeholder="Where and how does the paper address completeness?"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
            />
          </div>

          {/* Sections 2-6: single rating + evidence */}
          {PAPER_SECTIONS.filter(s => s.id !== 'completeness').map(section => (
            <div key={section.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
              <h4 className="text-sm font-black text-slate-800 mb-1">{section.title}</h4>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">{section.prompt}</p>
              <select
                value={ratings[section.id] || ''}
                onChange={e => setRatings(prev => ({ ...prev, [section.id]: e.target.value }))}
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none w-full mb-3"
              >
                <option value="">Select rating...</option>
                {RATINGS.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Evidence from their paper</label>
              <textarea
                value={evidence[section.id] || ''}
                onChange={e => setEvidence(prev => ({ ...prev, [section.id]: e.target.value }))}
                rows={3}
                placeholder="Where and how does the paper address this criterion?"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Self-Assessment'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
        </div>
    </ModalWrapper>
  )
}
