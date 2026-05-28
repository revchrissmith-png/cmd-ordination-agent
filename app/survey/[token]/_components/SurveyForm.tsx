// app/survey/[token]/_components/SurveyForm.tsx
// Client form for a tokenised survey response.
//
// State shape: answers[questionId] = value where value depends on type:
//   scale  → number
//   single → string (option value)
//   multi  → { selected: string[]; other?: string }
//   text   → string
//
// "Submit anonymously" toggle at the bottom; checking it sends anonymous=true
// to the API, which then strips profile_id and invitation_id off the row by
// CHECK constraint enforced at the DB.
'use client'

import { useState } from 'react'
import { C } from '../../../../lib/theme'
import type { Question } from '../../../../lib/surveys/types'

type Props = {
  token:      string
  title:      string
  intro:      string
  questions:  Question[]
  firstName:  string | null
}

type MultiValue = { selected: string[]; other?: string }
type Answers    = Record<string, number | string | MultiValue | undefined>

export default function SurveyForm({ token, title, intro, questions, firstName }: Props) {
  const [answers, setAnswers] = useState<Answers>({})
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(qid: string, value: Answers[string]) {
    setAnswers(prev => ({ ...prev, [qid]: value }))
  }

  function setMulti(qid: string, mutator: (prev: MultiValue) => MultiValue) {
    setAnswers(prev => ({
      ...prev,
      [qid]: mutator((prev[qid] as MultiValue) ?? { selected: [], other: '' }),
    }))
  }

  function missingRequired(): string | null {
    for (const q of questions) {
      if (!q.required) continue
      const v = answers[q.id]
      if (q.type === 'scale')  { if (typeof v !== 'number') return q.prompt }
      if (q.type === 'single') { if (typeof v !== 'string' || !v) return q.prompt }
      if (q.type === 'text')   { if (typeof v !== 'string' || !v.trim()) return q.prompt }
      if (q.type === 'multi')  {
        const mv = v as MultiValue | undefined
        const has = (mv?.selected?.length ?? 0) > 0 || (mv?.other?.trim().length ?? 0) > 0
        if (!has) return q.prompt
      }
    }
    return null
  }

  async function submit() {
    setError(null)
    const missing = missingRequired()
    if (missing) {
      setError(`Please answer: ${missing}`)
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/survey/${token}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ answers, anonymous }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error ?? 'Submission failed.')
      setSubmitting(false)
      return
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <h1 className="text-3xl font-black mb-3" style={{ color: C.deepSea }}>Thank you.</h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Your response was recorded. The OC and district team read every one — your candor shapes what these gatherings become.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black" style={{ color: C.deepSea }}>{title}</h1>
        {firstName && (
          <p className="text-sm text-slate-500 mt-1">Welcome, {firstName}.</p>
        )}
        {intro && (
          <p className="text-slate-700 leading-relaxed mt-4">{intro}</p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
            <div className="flex gap-3 items-start">
              <span className="text-xs font-black text-slate-400 mt-1">{i + 1}.</span>
              <div className="flex-1">
                <label className="block text-base font-bold text-slate-900 leading-snug">
                  {q.prompt}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {q.type === 'scale' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] uppercase tracking-wider text-slate-400 mb-2 gap-2">
                      <span>{q.scale_labels.min}</span>
                      <span className="text-right">{q.scale_labels.max}</span>
                    </div>
                    <div className="flex gap-2">
                      {Array.from({ length: q.scale_max - q.scale_min + 1 }, (_, idx) => {
                        const val = q.scale_min + idx
                        const selected = answers[q.id] === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => set(q.id, val)}
                            className={`flex-1 py-3 rounded-xl border text-base font-bold transition-all ${
                              selected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            {val}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {q.type === 'single' && (
                  <div className="mt-4 space-y-2">
                    {q.options.map(opt => {
                      const selected = answers[q.id] === opt.value
                      return (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            selected ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={selected}
                            onChange={() => set(q.id, opt.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm text-slate-800 font-medium">{opt.label}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {q.type === 'multi' && (
                  <div className="mt-4 space-y-2">
                    {q.options.map(opt => {
                      const mv = (answers[q.id] as MultiValue) ?? { selected: [], other: '' }
                      const selected = mv.selected.includes(opt.value)
                      return (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            selected ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setMulti(q.id, prev => ({
                              ...prev,
                              selected: selected
                                ? prev.selected.filter(v => v !== opt.value)
                                : [...prev.selected, opt.value],
                            }))}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <span className="text-sm text-slate-800 font-medium">{opt.label}</span>
                        </label>
                      )
                    })}
                    {q.allow_other_text && (
                      <input
                        type="text"
                        placeholder="Other…"
                        value={((answers[q.id] as MultiValue) ?? { selected: [] }).other ?? ''}
                        onChange={e => setMulti(q.id, prev => ({ ...prev, other: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 outline-none mt-1"
                      />
                    )}
                  </div>
                )}

                {q.type === 'text' && (
                  <div className="mt-4">
                    {q.helper && <p className="text-xs text-slate-500 mb-2">{q.helper}</p>}
                    <textarea
                      rows={q.multiline ? 4 : 2}
                      value={(answers[q.id] as string) ?? ''}
                      onChange={e => set(q.id, e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-blue-100 outline-none resize-y"
                      placeholder="Type your answer…"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Anonymity + submit */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 mt-6 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={e => setAnonymous(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600"
          />
          <div>
            <div className="text-sm font-bold text-slate-900">Submit anonymously</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your name is not attached to your answers. The system records that
              you submitted (so the link can’t be re-used), but the response row
              itself carries no link back to you.
            </div>
          </div>
        </label>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-300"
        >
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </button>
      </div>
    </main>
  )
}
