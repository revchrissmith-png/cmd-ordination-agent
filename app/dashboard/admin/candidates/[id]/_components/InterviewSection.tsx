// _components/InterviewSection.tsx
// Oral interview scheduling, status display, and link to interview console.
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../../../utils/supabase/client'
import { C } from '../../../../../../lib/theme'
import { inputClass } from '../../../../../../lib/formStyles'

interface Interview {
  id: string
  scheduled_date: string | null
  interview_date: string | null
  status: string
  result: string | null
  notes: string
  ordination_date: string | null
  officiant: string
  conducted_by_profile?: { first_name: string; last_name: string } | null
}

interface InterviewSectionProps {
  ordinandId: string
  candidate: { first_name: string; last_name: string }
  councilMembers: { id: string; first_name: string; last_name: string }[]
  isObserver: boolean
  onUpdate?: () => void
}

const STATUS_DISPLAY: Record<string, { label: string; badge: string; icon: string }> = {
  scheduled:   { label: 'Scheduled',   badge: 'bg-blue-100 text-blue-700',   icon: '📅' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-100 text-amber-700', icon: '🎙️' },
  decided:     { label: 'Decided',     badge: 'bg-green-100 text-green-700', icon: '✅' },
  cancelled:   { label: 'Cancelled',   badge: 'bg-slate-100 text-slate-500', icon: '✕' },
}

const RESULT_DISPLAY: Record<string, { label: string; colour: string }> = {
  sustained:     { label: 'Sustained',         colour: 'text-green-700 bg-green-50 border-green-200' },
  conditional:   { label: 'Conditionally Sustained', colour: 'text-blue-700 bg-blue-50 border-blue-200' },
  deferred:      { label: 'Deferred',          colour: 'text-amber-700 bg-amber-50 border-amber-200' },
  not_sustained: { label: 'Not Sustained',     colour: 'text-red-700 bg-red-50 border-red-200' },
}

export default function InterviewSection({ ordinandId, candidate, councilMembers, isObserver, onUpdate }: InterviewSectionProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)

  // Schedule form state
  const [schedDate, setSchedDate] = useState('')
  const [schedConductedBy, setSchedConductedBy] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [schedError, setSchedError] = useState('')

  async function fetchInterviews() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/admin/interviews?ordinandId=${ordinandId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const json = await res.json()
      setInterviews(json.interviews ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchInterviews() }, [ordinandId])

  async function handleSchedule() {
    if (!schedDate) { setSchedError('Pick a date'); return }
    setIsScheduling(true)
    setSchedError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSchedError('Session expired'); setIsScheduling(false); return }

    const res = await fetch('/api/admin/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        ordinandId,
        scheduledDate: schedDate,
        conductedBy: schedConductedBy || undefined,
      }),
    })
    if (res.ok) {
      setShowSchedule(false)
      setSchedDate('')
      setSchedConductedBy('')
      fetchInterviews()
      onUpdate?.()
    } else {
      const err = await res.json().catch(() => ({}))
      setSchedError(err.error ?? 'Failed to schedule')
    }
    setIsScheduling(false)
  }

  async function handleCancel(interviewId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/admin/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    fetchInterviews()
    onUpdate?.()
  }

  // Active interview = most recent non-cancelled
  const activeInterview = interviews.find(i => i.status !== 'cancelled')
  const pastInterviews = interviews.filter(i => i.status === 'cancelled' || (i.status === 'decided' && i !== activeInterview))

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Oral Interview</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Schedule, conduct, and record the formal oral interview with the Ordaining Council.
          </p>
        </div>
        {!isObserver && !activeInterview && (
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all flex-shrink-0"
            style={{ backgroundColor: C.deepSea }}
          >
            📅 Schedule Interview
          </button>
        )}
      </div>

      <div className="px-8 py-5 space-y-4">
        {/* Schedule form */}
        {showSchedule && (
          <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">New Interview</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Interview Date *</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={e => setSchedDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Lead Interviewer</label>
                <select
                  value={schedConductedBy}
                  onChange={e => setSchedConductedBy(e.target.value)}
                  className={inputClass + ' bg-white'}
                >
                  <option value="">— Select —</option>
                  {councilMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
            {schedError && <p className="text-xs font-bold text-red-600">{schedError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSchedule}
                disabled={isScheduling}
                className="px-5 py-2 text-white rounded-xl text-xs font-bold transition-all"
                style={{ backgroundColor: isScheduling ? '#94a3b8' : C.deepSea }}
              >
                {isScheduling ? 'Scheduling…' : 'Confirm Schedule'}
              </button>
              <button
                onClick={() => { setShowSchedule(false); setSchedError('') }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 py-4">
            <span className="animate-spin text-xl">⏳</span>
            <span className="font-medium text-sm">Loading interview data…</span>
          </div>
        )}

        {/* Active interview */}
        {activeInterview && (
          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{STATUS_DISPLAY[activeInterview.status]?.icon ?? '📅'}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_DISPLAY[activeInterview.status]?.badge ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_DISPLAY[activeInterview.status]?.label ?? activeInterview.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeInterview.status === 'scheduled' && !isObserver && (
                  <>
                    <Link
                      href={`/dashboard/admin/interview/${activeInterview.id}`}
                      className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
                      style={{ backgroundColor: C.allianceBlue }}
                    >
                      Open Console →
                    </Link>
                    <button
                      onClick={() => handleCancel(activeInterview.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {(activeInterview.status === 'in_progress' || activeInterview.status === 'decided') && (
                  <Link
                    href={`/dashboard/admin/interview/${activeInterview.id}`}
                    className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all"
                    style={{ backgroundColor: activeInterview.status === 'in_progress' ? '#d97706' : C.deepSea }}
                  >
                    {activeInterview.status === 'in_progress' ? '🎙️ Resume Interview' : 'View Record'}
                  </Link>
                )}
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-bold">Scheduled</p>
                <p className="font-medium text-slate-700">
                  {activeInterview.scheduled_date
                    ? new Date(activeInterview.scheduled_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              {activeInterview.conducted_by_profile && (
                <div>
                  <p className="text-xs text-slate-400 font-bold">Lead</p>
                  <p className="font-medium text-slate-700">
                    {activeInterview.conducted_by_profile.first_name} {activeInterview.conducted_by_profile.last_name}
                  </p>
                </div>
              )}
              {activeInterview.result && (
                <div>
                  <p className="text-xs text-slate-400 font-bold">Result</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${RESULT_DISPLAY[activeInterview.result]?.colour ?? 'text-slate-700'}`}>
                    {RESULT_DISPLAY[activeInterview.result]?.label ?? activeInterview.result}
                  </span>
                </div>
              )}
              {activeInterview.ordination_date && (
                <div>
                  <p className="text-xs text-slate-400 font-bold">Ordination</p>
                  <p className="font-medium text-slate-700">
                    {new Date(activeInterview.ordination_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
              {activeInterview.officiant && (
                <div>
                  <p className="text-xs text-slate-400 font-bold">Officiant</p>
                  <p className="font-medium text-slate-700">{activeInterview.officiant}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No interview yet */}
        {!loading && !activeInterview && !showSchedule && (
          <div className="py-6 text-center">
            <p className="text-slate-400 font-medium text-sm">No oral interview scheduled yet.</p>
            <p className="text-slate-300 text-xs font-medium mt-1">Schedule one when the ordinand has completed most requirements and evaluations.</p>
          </div>
        )}

        {/* Past / cancelled interviews */}
        {pastInterviews.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">History</p>
            <div className="space-y-1">
              {pastInterviews.map(iv => (
                <div key={iv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_DISPLAY[iv.status]?.badge ?? 'bg-slate-100'}`}>
                      {STATUS_DISPLAY[iv.status]?.label}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {iv.scheduled_date
                        ? new Date(iv.scheduled_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </span>
                  </div>
                  {iv.result && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${RESULT_DISPLAY[iv.result]?.colour ?? ''}`}>
                      {RESULT_DISPLAY[iv.result]?.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
