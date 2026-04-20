// _components/SermonRubric.tsx
// Sermon marking rubric section — extracted from grade/[assignmentId]/page.tsx
'use client'
import { SERMON_RUBRIC_SECTIONS, TOTAL_RUBRIC_CRITERIA, type SermonRubricScores } from '../../../../../../utils/sermonRubric'
import { inputClass } from '../../../../../../lib/formStyles'

const SCORE_COLOUR = (n: number, selected: boolean) => {
  if (!selected) return 'bg-white border-2 border-slate-200 text-slate-400 hover:border-slate-300'
  if (n === 1) return 'bg-red-500 text-white border-2 border-red-500'
  if (n === 2) return 'bg-amber-500 text-white border-2 border-amber-500'
  if (n === 3) return 'bg-blue-500 text-white border-2 border-blue-500'
  return 'bg-green-500 text-white border-2 border-green-500'
}

interface SermonRubricProps {
  rubricScores: SermonRubricScores
  setRubricScores: React.Dispatch<React.SetStateAction<SermonRubricScores>>
  sectionComments: Record<string, string>
  setSectionComments: React.Dispatch<React.SetStateAction<Record<string, string>>>
  scoredCount: number
}

export default function SermonRubric({ rubricScores, setRubricScores, sectionComments, setSectionComments, scoredCount }: SermonRubricProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest">Sermon Marking Rubric</h2>
        <span className="text-xs font-bold text-slate-400">{scoredCount} / {TOTAL_RUBRIC_CRITERIA} scored</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(scoredCount / TOTAL_RUBRIC_CRITERIA) * 100}%` }} />
      </div>
      <div className="space-y-8">
        {SERMON_RUBRIC_SECTIONS.map(section => (
          <div key={section.id}>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{section.title}</h3>
            <div className="space-y-4">
              {section.criteria.map(criterion => {
                const score = rubricScores[criterion.id] || 0
                return (
                  <div key={criterion.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <p className="text-sm font-bold text-slate-800 mb-3 leading-snug">{criterion.text}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium flex-1 min-w-0 leading-tight">{criterion.low}</span>
                      <div className="flex gap-1.5 shrink-0">
                        {[1, 2, 3, 4].map(n => (
                          <button key={n} onClick={() => setRubricScores(prev => ({ ...prev, [criterion.id]: n }))}
                            className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${SCORE_COLOUR(n, score === n)}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 font-medium flex-1 min-w-0 text-right leading-tight">{criterion.high}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Optional section-level comment */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Section Notes <span className="normal-case font-normal text-slate-300">(optional)</span>
              </label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                value={sectionComments[section.id] || ''}
                onChange={e => setSectionComments(prev => ({ ...prev, [section.id]: e.target.value }))}
                placeholder="Any specific feedback for this section..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
