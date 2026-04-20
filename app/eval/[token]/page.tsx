// app/eval/[token]/page.tsx
// Public evaluation form — no portal login required. Accessed via secure token link.
// Used for mentor and church board evaluations at end of ordinand journey.
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../utils/supabase/client'
import { SITE_DOMAIN, ORG_NAME, ORG_PARENT } from '../../../lib/config'

const RATING_CATEGORIES = [
  'Relationship & rapport with congregation',
  'Relationship & rapport with community',
  'Working knowledge of Scripture',
  'Content in sermons',
  'Administrative ability',
  'Delivery of sermons',
  'Ability to work through problems',
  'Ability to work with others',
  'Visitation and outreach',
  'Christian education ministries',
  'Evidence of personal discipline',
  'Ability to handle personal financial affairs',
  'Evidence of spiritual anointing',
]

const RATINGS = [
  { value: 'insufficient', label: 'Insufficient', short: 'Insuff.' },
  { value: 'adequate',     label: 'Adequate',     short: 'Adequate' },
  { value: 'good',         label: 'Good',          short: 'Good' },
  { value: 'excellent',    label: 'Excellent',     short: 'Excellent' },
  { value: 'exceptional',  label: 'Exceptional',  short: 'Exceptional' },
]

const RATING_SCALE_DESCRIPTION = [
  { rating: 'Insufficient', description: 'Does not yet meet the standard expected — significant development needed.' },
  { rating: 'Adequate',     description: 'Meets the minimum standard — some development still needed.' },
  { rating: 'Good',         description: 'Meets the standard well — minor areas for growth.' },
  { rating: 'Excellent',    description: 'Exceeds the standard consistently — a clear strength.' },
  { rating: 'Exceptional',  description: 'Outstanding — demonstrates exceptional giftedness in this area.' },
]

export default function EvalFormPage() {
  const params = useParams()
  const token = params && typeof params.token === 'string' ? params.token : ''

  const [loading, setLoading]     = useState(true)
  const [tokenData, setTokenData] = useState<any>(null)
  const [ordinand, setOrdinand]   = useState<any>(null)
  const [invalid, setInvalid]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  // Form state
  const [evaluatorName, setEvaluatorName] = useState('')
  const [ministryStartDate, setMinistryStartDate] = useState('')
  const [boardPosition, setBoardPosition] = useState('')
  const [q1, setQ1]           = useState('')
  const [q2, setQ2]           = useState('')
  const [q3, setQ3]           = useState('')
  const [q4, setQ4]           = useState<Record<string, string>>({})
  const [q5a, setQ5a]         = useState('')
  const [q5b, setQ5b]         = useState('')
  const [q5c, setQ5c]         = useState('')
  const [q6, setQ6]           = useState('')
  const [q7, setQ7]           = useState('')
  const [q8, setQ8]           = useState<boolean | null>(null)
  const [q8explain, setQ8explain] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')

  useEffect(() => {
    async function loadToken() {
      if (!token) { setInvalid(true); setLoading(false); return }
      const { data, error } = await supabase
        .from('evaluation_tokens')
        .select('id, token, eval_type, status, ordinand_id')
        .eq('token', token)
        .single()
      if (error || !data) { setInvalid(true); setLoading(false); return }
      if (data.status === 'submitted') { setTokenData(data); setSubmitted(true); setLoading(false); return }

      // Double-check: if an evaluation already exists for this token, treat as submitted
      // (covers edge case where token status update failed but evaluation was saved)
      const { data: existingEval } = await supabase
        .from('evaluations')
        .select('id')
        .eq('token_id', data.id)
        .maybeSingle()
      if (existingEval) { setTokenData(data); setSubmitted(true); setLoading(false); return }

      setTokenData(data)

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, full_name')
        .eq('id', data.ordinand_id)
        .single()
      setOrdinand(profile)
      setLoading(false)
    }
    loadToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!evaluatorName.trim()) { setError('Please enter your name before submitting.'); return }
    if (q8 === null) { setError('Please answer question 8 — the ordination recommendation.'); return }
    if (q8 === false && !q8explain.trim()) { setError('Please explain your recommendation in question 8.'); return }
    setSubmitting(true)

    try {
      const { error: evalError } = await supabase.from('evaluations').insert({
        token_id:               tokenData.id,
        ordinand_id:            tokenData.ordinand_id,
        eval_type:              tokenData.eval_type,
        evaluator_name:         evaluatorName.trim(),
        q1_call:                q1.trim() || null,
        q2_strengths:           q2.trim() || null,
        q3_development:         q3.trim() || null,
        q4_ratings:             Object.keys(q4).length > 0 ? q4 : null,
        q5a_spiritual_growth:   q5a.trim() || null,
        q5b_emotional_stability: q5b.trim() || null,
        q5c_family_relationship: q5c.trim() || null,
        q6_moral_concern:       q6.trim() || null,
        q7_fruitfulness:        q7.trim() || null,
        q8_recommendation:      q8,
        q8_explanation:         q8 === false ? q8explain.trim() || null : null,
        additional_comments:    additionalComments.trim() || null,
        ministry_start_date:    tokenData.eval_type === 'church' ? ministryStartDate || null : null,
        board_member_position:  tokenData.eval_type === 'church' ? boardPosition.trim() || null : null,
      })

      if (evalError) {
        setError('There was a problem submitting your evaluation. Please try again or contact the District Office.')
        setSubmitting(false)
        return
      }

      const { error: tokenError } = await supabase
        .from('evaluation_tokens')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', tokenData.id)

      if (tokenError) {
        setError('Your evaluation was saved, but we encountered a secondary error. Please contact the District Office to confirm receipt.')
        setSubmitting(false)
        return
      }

      setSubmitted(true)
    } catch {
      setError('A network error occurred. Please check your connection and try again.')
    }
    setSubmitting(false)
  }

  const isMentor  = tokenData?.eval_type === 'mentor'
  const isChurch  = tokenData?.eval_type === 'church'
  const formTitle = isMentor ? 'Mentor Evaluation' : 'Church Board Evaluation'
  const ordinandName = ordinand?.full_name || `${ordinand?.first_name || ''} ${ordinand?.last_name || ''}`.trim() || 'this ordinand'

  const ta  = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all resize-none'
  const inp = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all'
  const lab = 'block text-xs font-black text-slate-500 uppercase tracking-widest mb-2'
  const sec = 'bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5'

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <p className="text-slate-500 font-medium">Loading evaluation form…</p>
    </div>
  )

  if (invalid) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-10 max-w-md text-center shadow-sm">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Link Not Found</h1>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">
          This evaluation link is invalid or has expired. Please contact the Canadian Midwest District Office if you believe this is an error.
        </p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-10 max-w-md text-center shadow-sm">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">Evaluation Received</h1>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">
          Thank you for completing this evaluation. Your response has been submitted to the Canadian Midwest District Ordaining Council and attached to {tokenData?.eval_type === 'submitted' ? 'the' : 'the'} ordinand's record.
        </p>
        <p className="text-slate-400 text-xs font-medium mt-4">This link has now been deactivated. You may close this window.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* Header */}
      <header className="bg-[#00426A] border-b-4 border-[#0077C8] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/cmd-logo.png" alt="CMD Logo" className="h-9" />
          <div>
            <p className="text-white font-black text-sm tracking-wide">CMD ORDINATION PORTAL</p>
            <p className="text-blue-200 text-xs font-medium">Canadian Midwest District · The Alliance Canada</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">

        {/* Title card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <p className="text-xs font-black text-[#0077C8] uppercase tracking-widest mb-2">{formTitle}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Evaluation of {ordinandName}
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-3 leading-relaxed">
            The Ordaining Council of the Canadian Midwest District appreciates your assistance in completing this evaluation as{' '}
            <strong>{ordinandName}</strong> approaches the final stage of the ordination process.
            Your honest and thoughtful response is an important part of this decision.
          </p>
          {isChurch && (
            <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
              This form is to be completed by a member of the Board of Elders on behalf of the congregation.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Evaluator identity */}
          <div className={sec}>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Your Information</h2>
            <div>
              <label className={lab}>{isMentor ? 'Your Name (Mentor)' : 'Board Member Name'}</label>
              <input className={inp} value={evaluatorName} onChange={e => setEvaluatorName(e.target.value)}
                placeholder={isMentor ? 'Your full name' : 'Board member completing this form'} required />
            </div>
            {isChurch && (
              <>
                <div>
                  <label className={lab}>Position on Board</label>
                  <input className={inp} value={boardPosition} onChange={e => setBoardPosition(e.target.value)}
                    placeholder="e.g. Chair, Elder, Secretary…" />
                </div>
                <div>
                  <label className={lab}>Date {ordinandName.split(' ')[0]} Commenced Ministry at Your Church</label>
                  <input className={inp} type="date" value={ministryStartDate} onChange={e => setMinistryStartDate(e.target.value)} />
                </div>
              </>
            )}
          </div>

          {/* Q1 */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 1</label>
              <p className="text-slate-800 font-bold mb-3">Do you sense God's call upon {ordinandName.split(' ')[0]}'s life for ministry?</p>
              <textarea className={ta} rows={4} value={q1} onChange={e => setQ1(e.target.value)}
                placeholder="Please share your observations…" />
            </div>
          </div>

          {/* Q2 */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 2</label>
              <p className="text-slate-800 font-bold mb-3">What are {ordinandName.split(' ')[0]}'s greatest ministry strengths?</p>
              <textarea className={ta} rows={4} value={q2} onChange={e => setQ2(e.target.value)}
                placeholder="Please share your observations…" />
            </div>
          </div>

          {/* Q3 */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 3</label>
              <p className="text-slate-800 font-bold mb-3">What areas of {ordinandName.split(' ')[0]}'s ministry do you feel need to be strengthened or developed?</p>
              <textarea className={ta} rows={4} value={q3} onChange={e => setQ3(e.target.value)}
                placeholder="Please share your observations…" />
            </div>
          </div>

          {/* Q4 — Rating grid */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 4 — General Evaluation</label>
              <p className="text-slate-800 font-bold mb-4">Please rate {ordinandName.split(' ')[0]} on each of the following areas.</p>

              {/* Rating scale explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-xs font-black text-[#0077C8] uppercase tracking-widest mb-3">Rating Scale</p>
                <p className="text-xs text-slate-600 font-medium mb-3">
                  This evaluation uses the same five-point scale used by the Ordaining Council when reviewing written assignments.
                </p>
                <div className="space-y-2">
                  {RATING_SCALE_DESCRIPTION.map(({ rating, description }) => (
                    <div key={rating} className="flex gap-2 text-xs">
                      <span className="font-black text-slate-700 shrink-0 w-24">{rating}</span>
                      <span className="text-slate-500 font-medium">{description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {RATING_CATEGORIES.map(cat => (
                  <div key={cat} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-sm font-bold text-slate-800 mb-3">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {RATINGS.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setQ4(prev => ({ ...prev, [cat]: r.value }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                            q4[cat] === r.value
                              ? r.value === 'insufficient'
                                ? 'bg-red-500 text-white border-red-500'
                                : r.value === 'exceptional'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-[#0077C8] text-white border-[#0077C8]'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Q5 */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 5 — Please Comment On:</label>
              <div className="space-y-5">
                <div>
                  <p className="text-slate-700 font-bold text-sm mb-2">a) {ordinandName.split(' ')[0]}'s spiritual growth and maturity during their ministry</p>
                  <textarea className={ta} rows={3} value={q5a} onChange={e => setQ5a(e.target.value)}
                    placeholder="Please share your observations…" />
                </div>
                <div>
                  <p className="text-slate-700 font-bold text-sm mb-2">b) {ordinandName.split(' ')[0]}'s emotional stability</p>
                  <textarea className={ta} rows={3} value={q5b} onChange={e => setQ5b(e.target.value)}
                    placeholder="Please share your observations…" />
                </div>
                <div>
                  <p className="text-slate-700 font-bold text-sm mb-2">c) {ordinandName.split(' ')[0]}'s relationship with their family (e.g. child discipline, home order)</p>
                  <textarea className={ta} rows={3} value={q5c} onChange={e => setQ5c(e.target.value)}
                    placeholder="Please share your observations…" />
                </div>
              </div>
            </div>
          </div>

          {/* Q6 */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 6</label>
              <p className="text-slate-800 font-bold mb-3">Do you have any reason to question {ordinandName.split(' ')[0]}'s moral life?</p>
              <textarea className={ta} rows={4} value={q6} onChange={e => setQ6(e.target.value)}
                placeholder="Please share your observations. If no concerns, please state that explicitly." />
            </div>
          </div>

          {/* Q7 */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 7</label>
              <p className="text-slate-800 font-bold mb-3">Has {ordinandName.split(' ')[0]}'s ministry overall been fruitful? Please provide anecdotal evidence.</p>
              <textarea className={ta} rows={5} value={q7} onChange={e => setQ7(e.target.value)}
                placeholder="Please share specific examples and observations…" />
            </div>
          </div>

          {/* Q8 */}
          <div className={sec}>
            <div>
              <label className={lab}>Question 8</label>
              <p className="text-slate-800 font-bold mb-4">
                {isChurch
                  ? `Do you, as a Board of Elders, give ${ordinandName.split(' ')[0]} a recommendation for ordination?`
                  : `Do you recommend ${ordinandName.split(' ')[0]} for ordination?`}
              </p>
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setQ8(true)}
                  className={`px-8 py-3 rounded-xl font-black text-sm border-2 transition-all ${
                    q8 === true ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'
                  }`}
                >
                  ✓ Yes
                </button>
                <button
                  type="button"
                  onClick={() => setQ8(false)}
                  className={`px-8 py-3 rounded-xl font-black text-sm border-2 transition-all ${
                    q8 === false ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                  }`}
                >
                  ✕ No
                </button>
              </div>
              {q8 === false && (
                <div>
                  <label className={lab}>Please explain</label>
                  <textarea className={ta} rows={4} value={q8explain} onChange={e => setQ8explain(e.target.value)}
                    placeholder="Please share your reasoning…" />
                </div>
              )}
            </div>
          </div>

          {/* Additional comments */}
          <div className={sec}>
            <div>
              <label className={lab}>Additional Comments <span className="normal-case font-medium text-slate-400">(optional)</span></label>
              <textarea className={ta} rows={4} value={additionalComments} onChange={e => setAdditionalComments(e.target.value)}
                placeholder="Any further observations you'd like to share with the Ordaining Council…" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 font-bold text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <p className="text-sm text-slate-500 font-medium mb-5 leading-relaxed">
              By submitting this form, you confirm that the information provided is accurate and reflects your honest assessment. Your response will be shared with the Canadian Midwest District Ordaining Council.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-10 py-4 rounded-xl font-black text-white text-sm transition-all shadow-sm"
              style={{ backgroundColor: submitting ? '#aaa' : '#00426A', cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Submitting…' : 'Submit Evaluation'}
            </button>
          </div>

        </form>

        <p className="text-center text-xs text-slate-400 font-medium pb-8">
          {ORG_NAME} · {ORG_PARENT} · {SITE_DOMAIN}
        </p>
      </main>
    </div>
  )
}
