// _components/EvalResponseModal.tsx
// View submitted evaluation response — extracted from candidates/[id]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import ModalWrapper from '../../../../../components/ModalWrapper'

interface EvalResponseModalProps {
  evalToken: any
  candidate: any
  onClose: () => void
}

export default function EvalResponseModal({ evalToken, candidate, onClose }: EvalResponseModalProps) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('evaluations')
      .select('*')
      .eq('token_id', evalToken.id)
      .single()
      .then(({ data }) => { setDetail(data); setLoading(false) })
  }, [evalToken.id])

  return (
    <ModalWrapper onClose={onClose} ariaLabel="Evaluation response" maxWidth="max-w-2xl" innerClassName="max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-start rounded-t-3xl">
          <div>
            <p className="text-xs font-black text-[#0077C8] uppercase tracking-widest mb-1">
              {evalToken.eval_type === 'mentor' ? 'Mentor Evaluation' : 'Church Board Evaluation'}
            </p>
            <h3 className="text-lg font-black text-slate-900">{candidate?.first_name} {candidate?.last_name}</h3>
            {detail?.evaluator_name && <p className="text-sm text-slate-400 font-medium mt-0.5">Submitted by {detail.evaluator_name}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-black text-xl">&#x2715;</button>
        </div>
        <div className="px-8 py-6 space-y-6">
          {loading ? (
            <p className="text-slate-400 text-center font-medium py-8">Loading response...</p>
          ) : detail ? (
            <>
              {evalToken.eval_type === 'church' && detail.ministry_start_date && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Ministry Commenced</p>
                  <p className="text-sm font-medium text-slate-800">{new Date(detail.ministry_start_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              )}
              {evalToken.eval_type === 'church' && detail.board_member_position && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Board Position</p>
                  <p className="text-sm font-medium text-slate-800">{detail.board_member_position}</p>
                </div>
              )}
              {[
                { key: 'q1_call', label: "1. God's Call" },
                { key: 'q2_strengths', label: '2. Ministry Strengths' },
                { key: 'q3_development', label: '3. Areas for Development' },
              ].map(({ key, label }) => detail[key] && (
                <div key={key}>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{detail[key]}</p>
                </div>
              ))}
              {detail.q4_ratings && Object.keys(detail.q4_ratings).length > 0 && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">4. General Evaluation Ratings</p>
                  <div className="space-y-2">
                    {Object.entries(detail.q4_ratings).map(([cat, rating]) => (
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
              ].map(({ key, label }) => detail[key] && (
                <div key={key}>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{detail[key]}</p>
                </div>
              ))}
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">8. Ordination Recommendation</p>
                <p className={`text-sm font-black ${detail.q8_recommendation ? 'text-green-700' : 'text-red-700'}`}>
                  {detail.q8_recommendation ? '\u2713 Recommends for ordination' : '\u2715 Does not recommend for ordination'}
                </p>
                {detail.q8_explanation && <p className="text-sm font-medium text-slate-700 mt-1 whitespace-pre-wrap">{detail.q8_explanation}</p>}
              </div>
              {detail.additional_comments && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Additional Comments</p>
                  <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{detail.additional_comments}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-400 text-center font-medium py-8">Could not load evaluation response.</p>
          )}
        </div>
    </ModalWrapper>
  )
}
