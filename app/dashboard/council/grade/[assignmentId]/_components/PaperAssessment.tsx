// _components/PaperAssessment.tsx
// Paper assessment section (legacy + v2 format) — extracted from grade/[assignmentId]/page.tsx
'use client'
import { PAPER_SECTIONS } from '../../../../../../utils/selfAssessmentQuestions'
import { RATINGS, RATING_COLOUR, type Rating } from '../../../../../../lib/theme'
import { inputClass } from '../../../../../../lib/formStyles'

const RATING_CONFIG: Record<Rating, { colour: string; label: string }> = {
  insufficient: { colour: 'border-red-400 bg-red-50 text-red-700',         label: 'Insufficient' },
  adequate:     { colour: 'border-amber-400 bg-amber-50 text-amber-700',    label: 'Adequate' },
  good:         { colour: 'border-blue-400 bg-blue-50 text-blue-700',       label: 'Good' },
  excellent:    { colour: 'border-green-400 bg-green-50 text-green-700',    label: 'Excellent' },
  exceptional:  { colour: 'border-purple-400 bg-purple-50 text-purple-700', label: 'Exceptional' },
}

interface PaperAssessmentProps {
  topicData: { title: string; questions: { id: string; question: string }[] }
  isNewFormatSA: boolean
  isConverted?: boolean
  saSections: Record<string, any>
  oldAnswers: Record<string, string>
  oldRatings: Record<string, string>
  activeQuestion: string | null
  setActiveQuestion: (q: string | null) => void
  paperFeedback: Record<string, string>
  setPaperFeedback: React.Dispatch<React.SetStateAction<Record<string, string>>>
  paperSectionRatings: Record<string, string>
  setPaperSectionRatings: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export default function PaperAssessment({
  topicData, isNewFormatSA, isConverted, saSections, oldAnswers, oldRatings,
  activeQuestion, setActiveQuestion,
  paperFeedback, setPaperFeedback,
  paperSectionRatings, setPaperSectionRatings,
}: PaperAssessmentProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Paper Assessment</h2>
      <p className="text-xs text-slate-400 font-medium mb-6">
        {topicData.title} — review each section, read the ordinand&apos;s self-assessment, and provide your response
      </p>

      {/* Legacy format notice */}
      {!isNewFormatSA && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-sm font-bold text-amber-700 mb-1">Previous submission format</p>
            <p className="text-sm text-amber-600 font-medium">This submission used an earlier self-assessment format. The per-section review is available for submissions using the current format. You can still record an overall grade below.</p>
          </div>
          {/* Show old format responses */}
          <div className="space-y-4">
            {topicData.questions.map((q, i) => {
              const answer = oldAnswers[q.id] || ''
              const selfRating = oldRatings[q.id] || ''
              const isActive = activeQuestion === q.id
              return (
                <div key={q.id}
                  className={`border rounded-2xl p-5 cursor-pointer transition-all ${isActive ? 'border-blue-300 bg-blue-50/40 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                  onClick={() => setActiveQuestion(isActive ? null : q.id)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-bold text-slate-800 leading-relaxed flex-1">
                      <span className="text-blue-500 font-black mr-2">{i + 1}.</span>{q.question}
                    </p>
                    {selfRating && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 capitalize ${RATING_COLOUR[selfRating] || 'bg-slate-100 text-slate-500'}`}>{selfRating}</span>
                    )}
                  </div>
                  {answer ? (
                    <p className={`text-sm text-slate-700 leading-relaxed font-medium transition-all ${isActive ? '' : 'line-clamp-3'}`}>{answer}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No response provided.</p>
                  )}
                  {!isActive && answer.length > 200 && <p className="text-xs text-blue-500 font-bold mt-1">Click to read more</p>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* New v2 format — section-by-section review */}
      {isNewFormatSA && (
        <div className="space-y-8">
          {isConverted && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-blue-700 mb-1">Upgraded from earlier format</p>
              <p className="text-sm text-blue-600 font-medium">This submission used a previous self-assessment format. The ordinand&apos;s per-question responses and ratings have been mapped into the Completeness section. Sections 2–6 will not have self-assessment data from the ordinand — please assess those areas based on the paper itself.</p>
            </div>
          )}

          {/* Section 1: Completeness */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <h3 className="text-sm font-black text-slate-800">Completeness</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Have you addressed each of the key questions as outlined in the assignment guide?</p>
              </div>
            </div>

            {/* Per-question ordinand ratings */}
            <div className="space-y-2 mb-4">
              {topicData.questions.map((q, i) => {
                const qRating = saSections.completeness?.question_ratings?.[q.id] || ''
                return (
                  <div key={q.id} className="flex items-start justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-medium text-slate-700 flex-1 leading-relaxed">
                      <span className="text-blue-500 font-black mr-2">{i + 1}.</span>{q.question}
                    </p>
                    {qRating ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 capitalize ${RATING_COLOUR[qRating] || 'bg-slate-100 text-slate-500'}`}>{qRating}</span>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium shrink-0">&mdash;</span>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Shared evidence field */}
            {saSections.completeness?.evidence && (
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Evidence from ordinand</p>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{saSections.completeness.evidence}</p>
              </div>
            )}

            {/* Council section rating */}
            <div className="mb-3">
              <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">
                Your Rating <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RATINGS.map(r => (
                  <button key={r} onClick={() => setPaperSectionRatings(prev => ({ ...prev, completeness: r }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${paperSectionRatings['completeness'] === r ? RATING_CONFIG[r].colour + ' border-current' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}>
                    {RATING_CONFIG[r].label}
                  </button>
                ))}
                {paperSectionRatings['completeness'] && (
                  <button onClick={() => setPaperSectionRatings(prev => { const n = { ...prev }; delete n['completeness']; return n })}
                    className="px-2 py-1 text-xs text-slate-300 hover:text-slate-500 font-medium transition-colors">Clear</button>
                )}
              </div>
            </div>
            {/* Council feedback field */}
            <div>
              <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">Your Response</label>
              <p className="text-xs text-slate-400 font-medium mb-2">Affirm, validate, or engage with the ordinand&apos;s assessment of completeness.</p>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={paperFeedback['completeness'] || ''}
                onChange={e => setPaperFeedback(prev => ({ ...prev, completeness: e.target.value }))}
                placeholder="e.g. The ordinand has addressed all questions thoroughly. Q3 could have been developed further..."
              />
            </div>
          </div>

          {/* Sections 2-6 */}
          {PAPER_SECTIONS.filter(s => s.id !== 'completeness').map((section, idx) => {
            const sData      = saSections[section.id] || {}
            const selfRating = sData.rating   || ''
            const selfEvid   = sData.evidence || ''

            return (
              <div key={section.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">{idx + 2}</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{section.title}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">{section.prompt}</p>
                  </div>
                </div>

                {/* Ordinand's self-assessment */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ordinand Self-Assessment</p>
                    {selfRating && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${RATING_COLOUR[selfRating] || 'bg-slate-100 text-slate-500'}`}>{selfRating}</span>
                    )}
                  </div>
                  {selfEvid ? (
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{selfEvid}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No evidence provided.</p>
                  )}
                </div>

                {/* Council section rating */}
                <div className="mb-3">
                  <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">
                    Your Rating <span className="normal-case font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {RATINGS.map(r => (
                      <button key={r} onClick={() => setPaperSectionRatings(prev => ({ ...prev, [section.id]: r }))}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${paperSectionRatings[section.id] === r ? RATING_CONFIG[r].colour + ' border-current' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}>
                        {RATING_CONFIG[r].label}
                      </button>
                    ))}
                    {paperSectionRatings[section.id] && (
                      <button onClick={() => setPaperSectionRatings(prev => { const n = { ...prev }; delete n[section.id]; return n })}
                        className="px-2 py-1 text-xs text-slate-300 hover:text-slate-500 font-medium transition-colors">Clear</button>
                    )}
                  </div>
                </div>
                {/* Council feedback field */}
                <div>
                  <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-1.5">Your Response</label>
                  <p className="text-xs text-slate-400 font-medium mb-2">Affirm, validate, or engage with the ordinand&apos;s self-assessment.</p>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={paperFeedback[section.id] || ''}
                    onChange={e => setPaperFeedback(prev => ({ ...prev, [section.id]: e.target.value }))}
                    placeholder={`e.g. Your paper demonstrates solid ${section.title.toLowerCase()}...`}
                  />
                </div>
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}
