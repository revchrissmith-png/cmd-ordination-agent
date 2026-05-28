// app/dashboard/admin/events/[id]/survey/results/page.tsx
// Aggregate results dashboard for a cohort-event feedback survey.
//
// Renders questions from the frozen questions JSONB on the survey row, so
// the display matches exactly what was sent. Anonymous responses surface
// without a name; identified ones show the ordinand.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../../../utils/supabase/client'
import { C } from '../../../../../../../lib/theme'
import { PageSkeleton } from '../../../../../../components/Skeleton'
import type { Question } from '../../../../../../../lib/surveys/types'

type EventRow = { id: string; title: string; event_date: string }
type SurveyRow = {
  id:        string
  title:     string
  intro:     string | null
  questions: Question[]
  send_at:   string | null
  sent_at:   string | null
  closes_at: string | null
}
type ResponseRow = {
  id:           string
  profile_id:   string | null
  anonymous:    boolean
  answers:      Record<string, any>
  submitted_at: string
  profile?:     { full_name: string | null; first_name: string | null; last_name: string | null } | null
}

export default function SurveyResultsPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? ''

  const [event, setEvent] = useState<EventRow | null>(null)
  const [survey, setSurvey] = useState<SurveyRow | null>(null)
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [invitedCount, setInvitedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function load() {
    setLoading(true)
    const { data: ev } = await supabase
      .from('cohort_events')
      .select('id, title, event_date')
      .eq('id', eventId)
      .single()
    setEvent(ev as EventRow)

    const { data: surveys } = await supabase
      .from('cohort_event_surveys')
      .select('id, title, intro, questions, send_at, sent_at, closes_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
    const cur = (surveys?.[0] as SurveyRow | undefined) ?? null
    setSurvey(cur)

    if (cur) {
      const [{ data: resps }, { count }] = await Promise.all([
        supabase
          .from('cohort_event_survey_responses')
          .select('id, profile_id, anonymous, answers, submitted_at, profile:profiles ( full_name, first_name, last_name )')
          .eq('survey_id', cur.id)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('cohort_event_survey_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', cur.id),
      ])
      setResponses((resps ?? []) as any[])
      setInvitedCount(count ?? 0)
    }
    setLoading(false)
  }

  const responseRate = useMemo(() => {
    if (invitedCount === 0) return 0
    return Math.round((responses.length / invitedCount) * 100)
  }, [responses.length, invitedCount])

  const anonCount = useMemo(() => responses.filter(r => r.anonymous).length, [responses])
  const idCount = responses.length - anonCount

  if (loading) return <PageSkeleton />
  if (!event)  return <div className="p-8 text-slate-500">Event not found.</div>
  if (!survey) return (
    <div className="max-w-3xl mx-auto p-8">
      <Link href="/dashboard/admin?tab=calendar" className="text-xs font-bold uppercase tracking-wider text-slate-500">← Back to events</Link>
      <h1 className="text-3xl font-black mt-2" style={{ color: C.deepSea }}>{event.title}</h1>
      <p className="text-slate-500 mt-4">No survey has been created for this event yet.</p>
      <Link href={`/dashboard/admin/events/${eventId}/survey`} className="inline-block mt-4 text-blue-700 font-bold">Create one →</Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <Link href="/dashboard/admin?tab=calendar" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">← Back to events</Link>
        <h1 className="text-3xl font-black mt-2" style={{ color: C.deepSea }}>Results · {event.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{event.event_date}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <Link href={`/dashboard/admin/events/${eventId}/attendance`} className="font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider">Attendance</Link>
          <Link href={`/dashboard/admin/events/${eventId}/survey`} className="font-bold text-purple-600 hover:text-purple-800 uppercase tracking-wider">Survey composer</Link>
          <button onClick={load} className="font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider">↻ Refresh</button>
        </div>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Responses" value={responses.length} sub={`of ${invitedCount} invited`} />
        <Metric label="Response rate" value={`${responseRate}%`} sub={survey.sent_at ? `since ${new Date(survey.sent_at).toLocaleDateString('en-CA', { timeZone: 'America/Regina', month: 'short', day: 'numeric' })}` : 'not sent yet'} />
        <Metric label="Identified" value={idCount} sub={`${responses.length === 0 ? 0 : Math.round((idCount / responses.length) * 100)}%`} />
        <Metric label="Anonymous" value={anonCount} sub={`${responses.length === 0 ? 0 : Math.round((anonCount / responses.length) * 100)}%`} />
      </div>

      {survey.sent_at == null && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm">
          This survey hasn’t been dispatched yet — no responses are expected to arrive until after the scheduled send time.
        </div>
      )}

      {/* Per-question aggregates */}
      <div className="space-y-4">
        {survey.questions.map((q, i) => (
          <QuestionResultCard key={q.id} index={i + 1} question={q} responses={responses} />
        ))}
      </div>

      <div className="text-xs text-slate-400 text-center pt-4 pb-8">
        {responses.length} response{responses.length === 1 ? '' : 's'} · refreshed {new Date().toLocaleTimeString('en-CA', { timeZone: 'America/Regina' })}
      </div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-3xl font-black text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function respondentLabel(r: ResponseRow): string {
  if (r.anonymous) return 'Anonymous'
  const p = r.profile
  return (
    p?.full_name
      ?? `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim()
      ?? '(unknown)'
  )
}

function QuestionResultCard({
  index,
  question,
  responses,
}: {
  index:     number
  question:  Question
  responses: ResponseRow[]
}) {
  const answered = responses
    .map(r => ({ r, v: r.answers?.[question.id] }))
    .filter(({ v }) => v !== undefined && v !== null && v !== '')

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
      <div className="flex gap-3 items-start mb-4">
        <span className="text-xs font-black text-slate-400 mt-1">{index}.</span>
        <div className="flex-1">
          <div className="text-base font-bold text-slate-900 leading-snug">{question.prompt}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">
            {question.type} · {answered.length} answered
          </div>
        </div>
      </div>

      {question.type === 'scale' && (
        <ScaleResult question={question} answers={answered.map(a => a.v as number)} />
      )}
      {question.type === 'single' && (
        <SingleResult question={question} answers={answered.map(a => a.v as string)} />
      )}
      {question.type === 'multi' && (
        <MultiResult question={question} entries={answered.map(a => a.v as { selected?: string[]; other?: string })} />
      )}
      {question.type === 'text' && (
        <TextResult entries={answered.map(({ r, v }) => ({ name: respondentLabel(r), text: String(v), submittedAt: r.submitted_at, anonymous: r.anonymous }))} />
      )}
    </div>
  )
}

function ScaleResult({
  question,
  answers,
}: {
  question: Extract<Question, { type: 'scale' }>
  answers:  number[]
}) {
  if (answers.length === 0) return <Empty />
  const avg = answers.reduce((s, n) => s + n, 0) / answers.length
  const buckets: Record<number, number> = {}
  for (let v = question.scale_min; v <= question.scale_max; v++) buckets[v] = 0
  for (const v of answers) if (buckets[v] !== undefined) buckets[v]++
  const maxCount = Math.max(...Object.values(buckets), 1)

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-3xl font-black" style={{ color: C.deepSea }}>{avg.toFixed(1)}</span>
        <span className="text-xs text-slate-500">average · range {question.scale_min}–{question.scale_max}</span>
      </div>
      <div className="space-y-2">
        {Object.entries(buckets).map(([v, count]) => (
          <div key={v} className="flex items-center gap-3">
            <div className="w-6 text-xs font-bold text-slate-500 text-right">{v}</div>
            <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <div className="w-10 text-xs font-bold text-slate-600 text-right">{count}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400 mt-3">
        <span>{question.scale_labels.min}</span>
        <span>{question.scale_labels.max}</span>
      </div>
    </div>
  )
}

function SingleResult({
  question,
  answers,
}: {
  question: Extract<Question, { type: 'single' }>
  answers:  string[]
}) {
  if (answers.length === 0) return <Empty />
  const total = answers.length
  return (
    <div className="space-y-2">
      {question.options.map(opt => {
        const count = answers.filter(a => a === opt.value).length
        const pct = total === 0 ? 0 : Math.round((count / total) * 100)
        return (
          <div key={opt.value} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                <span className="text-xs font-bold text-slate-500 ml-3 shrink-0">{count} · {pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MultiResult({
  question,
  entries,
}: {
  question: Extract<Question, { type: 'multi' }>
  entries:  { selected?: string[]; other?: string }[]
}) {
  if (entries.length === 0) return <Empty />
  const total = entries.length
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {question.options.map(opt => {
          const count = entries.filter(e => Array.isArray(e.selected) && e.selected.includes(opt.value)).length
          const pct = total === 0 ? 0 : Math.round((count / total) * 100)
          return (
            <div key={opt.value} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                  <span className="text-xs font-bold text-slate-500 ml-3 shrink-0">{count} · {pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {question.allow_other_text && (() => {
        const others = entries.map(e => e.other?.trim()).filter((s): s is string => !!s)
        if (others.length === 0) return null
        return (
          <div className="pt-3 mt-3 border-t border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Other ({others.length})</div>
            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
              {others.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )
      })()}
    </div>
  )
}

function TextResult({
  entries,
}: {
  entries: { name: string; text: string; submittedAt: string; anonymous: boolean }[]
}) {
  if (entries.length === 0) return <Empty />
  return (
    <ul className="space-y-3">
      {entries.map((e, i) => (
        <li key={i} className="border-l-4 border-slate-200 pl-4 py-1">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-1">
            <span className={e.anonymous ? 'text-slate-400' : 'text-slate-600'}>{e.name}</span>
            <span className="text-slate-300 mx-2">·</span>
            <span className="text-slate-400">{new Date(e.submittedAt).toLocaleDateString('en-CA', { timeZone: 'America/Regina', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{e.text}</div>
        </li>
      ))}
    </ul>
  )
}

function Empty() {
  return <div className="text-sm text-slate-400 italic">No answers yet.</div>
}
