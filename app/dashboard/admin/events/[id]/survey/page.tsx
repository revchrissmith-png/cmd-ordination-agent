// app/dashboard/admin/events/[id]/survey/page.tsx
// Admin survey composer for a cohort event.
//
// Flow:
//   1. Load the v3 seed (intercultural-fluency-2026-05-27.ts) into editable
//      title/intro state. Question list is shown read-only — editing the
//      questions themselves means editing the seed file in git, which keeps
//      the question text reviewable rather than scattered through DB rows.
//   2. Pick a send time (default: tomorrow 08:00 Regina).
//   3. "Schedule send" creates the cohort_event_surveys row with the chosen
//      send_at; the hourly cron sweeps for due rows and dispatches.
//   4. "Send now" is the manual-fallback button.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../../utils/supabase/client'
import { C } from '../../../../../../lib/theme'
import { btnPrimary, inputClass, labelClass, textareaClass } from '../../../../../../lib/formStyles'
import { PageSkeleton } from '../../../../../components/Skeleton'
import { useFlash } from '../../../../../../hooks/useFlash'
import { INTERCULTURAL_FLUENCY_2026_05_27 } from '../../../../../../lib/surveys/intercultural-fluency-2026-05-27'
import type { Section, Question } from '../../../../../../lib/surveys/types'

type EventRow = {
  id:         string
  title:      string
  event_date: string
}

type ExistingSurvey = {
  id:        string
  title:     string
  intro:     string | null
  send_at:   string | null
  sent_at:   string | null
}

const SEED = INTERCULTURAL_FLUENCY_2026_05_27

/** Tomorrow 08:00 in Regina, returned as a `YYYY-MM-DDTHH:mm` value
 *  suitable for `<input type="datetime-local">`. SK doesn't observe DST so
 *  the offset is constant -06:00. */
function defaultSendAtLocal(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Regina',
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  const next = new Date(`${y}-${m}-${d}T08:00:00-06:00`)
  next.setUTCDate(next.getUTCDate() + 1)
  // Format back as Regina local
  return next
    .toLocaleString('sv-SE', { timeZone: 'America/Regina' })
    .replace(' ', 'T')
    .slice(0, 16)
}

/** Convert a Regina-local datetime-local value to an ISO instant. */
function reginaLocalToISO(local: string): string {
  // Regina is constant -06:00 (no DST).
  return new Date(`${local}:00-06:00`).toISOString()
}

export default function SurveyComposerPage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? ''

  const [event, setEvent] = useState<EventRow | null>(null)
  const [existing, setExisting] = useState<ExistingSurvey | null>(null)
  const [attendedCount, setAttendedCount] = useState(0)
  const [title, setTitle] = useState(SEED.title)
  const [intro, setIntro] = useState(SEED.intro)
  const [sendAtLocal, setSendAtLocal] = useState(defaultSendAtLocal())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { message, flash } = useFlash(5000)

  useEffect(() => {
    if (!eventId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function load() {
    setLoading(true)
    const [{ data: ev }, { data: surveys }, { count }] = await Promise.all([
      supabase.from('cohort_events').select('id, title, event_date').eq('id', eventId).single(),
      supabase
        .from('cohort_event_surveys')
        .select('id, title, intro, send_at, sent_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('cohort_event_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('attended', true),
    ])
    setEvent(ev as EventRow)
    setAttendedCount(count ?? 0)
    const cur = surveys?.[0] as ExistingSurvey | undefined
    if (cur) {
      setExisting(cur)
      setTitle(cur.title)
      setIntro(cur.intro ?? '')
      if (cur.send_at) {
        const dt = new Date(cur.send_at)
        setSendAtLocal(
          dt.toLocaleString('sv-SE', { timeZone: 'America/Regina' }).replace(' ', 'T').slice(0, 16),
        )
      }
    }
    setLoading(false)
  }

  const allQuestions: Section[] = useMemo(() => SEED.sections, [])

  async function submit(mode: 'schedule' | 'send_now') {
    if (attendedCount === 0) {
      flash('No one is marked as attended — mark attendance first.', 'error')
      return
    }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) {
      flash('Not signed in', 'error')
      setSaving(false)
      return
    }
    const sendAtISO = mode === 'send_now'
      ? new Date().toISOString()
      : reginaLocalToISO(sendAtLocal)

    const res = await fetch(`/api/admin/events/${eventId}/survey`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        title:   title.trim(),
        intro:   intro.trim(),
        send_at: sendAtISO,
        // The composer is locked to the v3 seed for this initial release;
        // editing question text means editing the file in git. Server
        // verifies and re-reads the seed by slug to prevent tampering.
        seed_slug: SEED.slug,
        dispatch_now: mode === 'send_now',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      flash(`Failed: ${data?.error ?? res.statusText}`, 'error')
      setSaving(false)
      return
    }
    flash(
      mode === 'send_now'
        ? `Survey sent to ${data.invited} attendees.`
        : `Survey scheduled — will send to ${data.invited} attendees at ${sendAtLocal} (Regina).`,
      'success',
    )
    void load()
    setSaving(false)
  }

  if (loading) return <PageSkeleton />
  if (!event)  return <div className="p-8 text-slate-500">Event not found.</div>

  const alreadySent = !!existing?.sent_at

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <Link href="/dashboard/admin?tab=calendar" className="text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider">
          ← Back to events
        </Link>
        <h1 className="text-3xl font-black mt-2" style={{ color: C.deepSea }}>
          Survey · {event.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{event.event_date}</p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <Link href={`/dashboard/admin/events/${eventId}/attendance`} className="font-bold text-blue-700 hover:text-blue-900">
            ← Attendance ({attendedCount} marked)
          </Link>
          <Link href={`/dashboard/admin/events/${eventId}/survey/results`} className="font-bold text-amber-600 hover:text-amber-800">
            Results →
          </Link>
        </div>
      </div>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}

      {alreadySent && (
        <div className="px-4 py-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-sm">
          This survey was already dispatched at <strong>{new Date(existing!.sent_at!).toLocaleString('en-CA', { timeZone: 'America/Regina' })}</strong>. Scheduling another send will create a new survey.
        </div>
      )}

      {/* Title + intro (editable) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Intro</label>
          <textarea
            className={textareaClass()}
            rows={5}
            value={intro}
            onChange={e => setIntro(e.target.value)}
          />
        </div>
      </div>

      {/* Questions (read-only preview) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Questions</div>
          <p className="text-xs text-slate-500 mt-1">
            Locked to the <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">{SEED.slug}</code> template. Edits to the question list happen in the source file and ship in a deploy.
          </p>
        </div>
        {allQuestions.map((sec, si) => (
          <div key={si} className="space-y-3">
            <div className="text-sm font-bold" style={{ color: C.deepSea }}>{sec.heading}</div>
            <ol className="space-y-2 list-decimal pl-5 text-sm text-slate-700">
              {sec.questions.map((q: Question) => (
                <li key={q.id}>
                  <span>{q.prompt}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-slate-400">{q.type}{q.required ? ' · required' : ''}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className={labelClass}>Send time (Regina / Central, no DST)</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={sendAtLocal}
            onChange={e => setSendAtLocal(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-2">
            The cron sweeps for due surveys once a day at 08:00 Regina. Anything scheduled before then will go out at the next 08:00 sweep — use “Send now” if you need it out sooner.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-4 bg-white border border-slate-200 rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-slate-600">
          Will email <span className="font-bold text-slate-900">{attendedCount}</span> attendees.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => submit('send_now')}
            disabled={saving || attendedCount === 0}
            className="text-sm font-bold uppercase tracking-wider text-red-700 hover:text-red-900 disabled:text-slate-300"
          >
            Send now
          </button>
          <button onClick={() => submit('schedule')} disabled={saving || attendedCount === 0} className={btnPrimary}>
            {saving ? 'Working…' : 'Schedule send'}
          </button>
        </div>
      </div>
    </div>
  )
}
