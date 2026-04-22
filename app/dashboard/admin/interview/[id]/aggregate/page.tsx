// app/dashboard/admin/interview/[id]/aggregate/page.tsx
// Chair's Aggregate Score View — pop-out window for screen-casting during debrief.
// Shows anonymous per-section averages with visual spectrum bars.
// Designed for large display: clean, high-contrast, minimal clutter.
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../../../utils/supabase/client'
import { C } from '../../../../../../lib/theme'
import {
  INTERVIEW_SECTIONS,
  INTERVIEW_RATING_LABELS,
  type InterviewRating,
} from '../../../../../../utils/interviewQuestions'

interface SectionAggregate {
  sectionId: string
  title: string
  ratings: string[]
  values: number[]
  average: number | null
  averageRating: string | null
}

interface AggregateData {
  interviewId: string
  submittedCount: number
  sections: Record<string, SectionAggregate>
  overallAverage: number | null
  overallRating: string | null
}

// Colour stops for the spectrum bar
const SPECTRUM_COLOURS: Record<InterviewRating, string> = {
  insufficient: '#ef4444',
  adequate: '#f59e0b',
  good: '#3b82f6',
  excellent: '#22c55e',
  exceptional: '#a855f7',
}

const SPECTRUM_BG: Record<InterviewRating, string> = {
  insufficient: 'bg-red-50 border-red-200 text-red-700',
  adequate: 'bg-amber-50 border-amber-200 text-amber-700',
  good: 'bg-blue-50 border-blue-200 text-blue-700',
  excellent: 'bg-green-50 border-green-200 text-green-700',
  exceptional: 'bg-purple-50 border-purple-200 text-purple-700',
}

export default function AggregateScorePage() {
  const params = useParams<{ id: string }>()
  const interviewId = params?.id ?? ''

  const [data, setData] = useState<AggregateData | null>(null)
  const [ordinandName, setOrdinandName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Session expired'); setLoading(false); return }

    const res = await fetch(`/api/admin/interview-scores-aggregate?interviewId=${interviewId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { setError('Failed to load scores'); setLoading(false); return }
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  // Initial load + fetch ordinand name
  useEffect(() => {
    async function init() {
      const { data: iv } = await supabase
        .from('oral_interviews')
        .select('ordinand_id')
        .eq('id', interviewId)
        .single()
      if (iv) {
        const { data: ord } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', iv.ordinand_id)
          .single()
        if (ord) setOrdinandName(`${ord.first_name} ${ord.last_name}`.trim())
      }
      fetchData()
    }
    init()
  }, [interviewId])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [autoRefresh, interviewId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="animate-spin text-3xl">⏳</span>
          <span className="font-bold text-lg">Loading aggregate scores…</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 font-bold text-lg">{error || 'No data'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 sm:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Council Interview — Aggregate Scores</p>
          <h1 className="text-3xl sm:text-4xl font-black mt-1">{ordinandName || 'Ordinand'}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Submitted</p>
            <p className="text-2xl font-black text-white">{data.submittedCount}</p>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              autoRefresh ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            {autoRefresh ? '● Live' : '○ Paused'}
          </button>
        </div>
      </div>

      {data.submittedCount === 0 ? (
        <div className="bg-slate-800 rounded-3xl p-16 text-center">
          <p className="text-slate-500 font-bold text-xl">Waiting for council members to submit scores…</p>
          <p className="text-slate-600 font-medium mt-2">This page auto-refreshes every 10 seconds.</p>
        </div>
      ) : (
        <>
          {/* Section scores */}
          <div className="space-y-4 mb-10">
            {INTERVIEW_SECTIONS.map(section => {
              const agg = data.sections[section.id]
              if (!agg) return null
              const avg = agg.average
              const rating = agg.averageRating as InterviewRating | null

              // Position on spectrum (1-5 maps to 0-100%)
              const pct = avg !== null ? ((avg - 1) / 4) * 100 : 0

              return (
                <div key={section.id} className="bg-slate-800 rounded-2xl px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-black text-white">{section.title}</h3>
                    <div className="flex items-center gap-3">
                      {rating && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${SPECTRUM_BG[rating]}`}>
                          {INTERVIEW_RATING_LABELS[rating]}
                        </span>
                      )}
                      {avg !== null && (
                        <span className="text-sm font-black text-slate-400">{avg.toFixed(2)}</span>
                      )}
                      <span className="text-xs text-slate-600 font-medium">{agg.ratings.length} votes</span>
                    </div>
                  </div>

                  {/* Spectrum bar */}
                  <div className="relative h-3 rounded-full overflow-hidden" style={{
                    background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 25%, #3b82f6 50%, #22c55e 75%, #a855f7 100%)',
                    opacity: 0.3,
                  }}>
                  </div>
                  <div className="relative h-3 -mt-3 rounded-full overflow-hidden" style={{
                    background: 'transparent',
                  }}>
                    {avg !== null && (
                      <div
                        className="absolute top-0 w-4 h-3 rounded-full transition-all duration-500"
                        style={{
                          left: `calc(${pct}% - 8px)`,
                          backgroundColor: rating ? SPECTRUM_COLOURS[rating] : '#fff',
                          boxShadow: `0 0 8px ${rating ? SPECTRUM_COLOURS[rating] : '#fff'}`,
                        }}
                      />
                    )}
                  </div>

                  {/* Scale labels */}
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-600 font-medium">Insufficient</span>
                    <span className="text-xs text-slate-600 font-medium">Exceptional</span>
                  </div>

                  {/* Individual vote distribution (anonymous dots) */}
                  {agg.ratings.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {agg.ratings.map((r, i) => (
                        <span
                          key={i}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: SPECTRUM_COLOURS[r as InterviewRating] || '#64748b' }}
                          title={INTERVIEW_RATING_LABELS[r as InterviewRating] || r}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Overall */}
          <div className="bg-slate-800 rounded-3xl p-8 text-center">
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-2">Overall Average</p>
            {data.overallAverage !== null ? (
              <>
                <p className="text-5xl font-black" style={{
                  color: data.overallRating ? SPECTRUM_COLOURS[data.overallRating as InterviewRating] : '#fff',
                }}>
                  {INTERVIEW_RATING_LABELS[data.overallRating as InterviewRating] || '—'}
                </p>
                <p className="text-2xl font-bold text-slate-400 mt-1">{data.overallAverage.toFixed(2)} / 5.00</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-slate-600">No scores yet</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
