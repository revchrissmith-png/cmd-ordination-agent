// app/dashboard/admin/events/[id]/attendance/page.tsx
// Admin attendance check-off for an in-person cohort event.
// Lists every active ordinand; admin toggles who actually showed up,
// then saves. The saved attendance is the universe that the post-event
// survey dispatch will email.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../../utils/supabase/client'
import { C } from '../../../../../../lib/theme'
import { btnPrimary } from '../../../../../../lib/formStyles'
import { PageSkeleton } from '../../../../../components/Skeleton'
import { useFlash } from '../../../../../../hooks/useFlash'

type Ordinand = {
  id:           string
  full_name:    string | null
  first_name:   string | null
  last_name:    string | null
  email:        string | null
  cohort_year:  string | null
  attended:     boolean
}

type EventRow = {
  id:          string
  title:       string
  event_date:  string
  event_type:  string
  location:    string | null
}

export default function AttendancePage() {
  const params = useParams<{ id: string }>()
  const eventId = params?.id ?? ''

  const [event, setEvent] = useState<EventRow | null>(null)
  const [ordinands, setOrdinands] = useState<Ordinand[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { message, flash } = useFlash(4000)

  useEffect(() => {
    if (!eventId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function load() {
    setLoading(true)

    // 1. Event
    const { data: ev, error: evErr } = await supabase
      .from('cohort_events')
      .select('id, title, event_date, event_type, location')
      .eq('id', eventId)
      .single()
    if (evErr || !ev) {
      flash(`Event not found: ${evErr?.message ?? 'no row'}`, 'error')
      setLoading(false)
      return
    }
    setEvent(ev as EventRow)

    // 2. All active ordinands (the invited universe per CLAUDE.md ruling)
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, cohort_year, roles, status, is_demo')
      .eq('status', 'active')
      .contains('roles', ['ordinand'])
      .eq('is_demo', false)
      .order('last_name', { ascending: true, nullsFirst: false })
    if (pErr) {
      flash(`Couldn’t load ordinands: ${pErr.message}`, 'error')
      setLoading(false)
      return
    }

    // 3. Existing attendance flags for this event
    const { data: existing } = await supabase
      .from('cohort_event_attendance')
      .select('profile_id, attended')
      .eq('event_id', eventId)
    const attendedById = new Map<string, boolean>(
      (existing ?? []).map(r => [r.profile_id as string, r.attended as boolean]),
    )

    setOrdinands(
      (profiles ?? []).map((p: any) => ({
        id:          p.id,
        full_name:   p.full_name,
        first_name:  p.first_name,
        last_name:   p.last_name,
        email:       p.email,
        cohort_year: p.cohort_year,
        attended:    attendedById.get(p.id) ?? false,
      })),
    )
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return ordinands
    return ordinands.filter(o => {
      const hay = `${o.full_name ?? ''} ${o.first_name ?? ''} ${o.last_name ?? ''} ${o.email ?? ''} ${o.cohort_year ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [ordinands, filter])

  const attendedCount = ordinands.filter(o => o.attended).length

  function toggleOne(id: string) {
    setOrdinands(prev => prev.map(o => o.id === id ? { ...o, attended: !o.attended } : o))
  }

  function setAllVisible(value: boolean) {
    const visibleIds = new Set(filtered.map(o => o.id))
    setOrdinands(prev => prev.map(o => visibleIds.has(o.id) ? { ...o, attended: value } : o))
  }

  async function save() {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) {
      flash('Not signed in', 'error')
      setSaving(false)
      return
    }
    const res = await fetch(`/api/admin/events/${eventId}/attendance`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        rows: ordinands.map(o => ({ profile_id: o.id, attended: o.attended })),
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      flash(`Save failed: ${body?.error ?? res.statusText}`, 'error')
      setSaving(false)
      return
    }
    flash(`Saved — ${body.attended} marked present`, 'success')
    setSaving(false)
  }

  if (loading) return <PageSkeleton />
  if (!event)  return <div className="p-8 text-slate-500">Event not found.</div>

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <Link href="/dashboard/admin?tab=calendar" className="text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider">
          ← Back to events
        </Link>
        <h1 className="text-3xl font-black text-slate-900 mt-2" style={{ color: C.deepSea }}>
          Attendance · {event.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {event.event_date} · {event.event_type === 'in_person' ? `In person${event.location ? ` · ${event.location}` : ''}` : 'Online'}
        </p>
        <p className="text-sm text-slate-600 mt-3 max-w-2xl">
          Check off everyone who actually attended. The post-event survey will go only to those marked here.
        </p>
      </div>

      {message.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name, email, cohort…"
          className="w-full sm:w-80 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 outline-none"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{attendedCount}</span> / {ordinands.length} attended
          </span>
          <button
            type="button"
            onClick={() => setAllVisible(true)}
            className="text-xs font-bold uppercase tracking-wider text-blue-700 hover:text-blue-900"
          >
            Mark all (visible)
          </button>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={() => setAllVisible(false)}
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700"
          >
            Clear (visible)
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No ordinands match that filter.</div>
        ) : filtered.map(o => (
          <label
            key={o.id}
            className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={o.attended}
              onChange={() => toggleOne(o.id)}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">
                {o.full_name ?? `${o.first_name ?? ''} ${o.last_name ?? ''}`.trim() ?? '(no name)'}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {o.email ?? 'no email'} {o.cohort_year ? `· Cohort ${o.cohort_year}` : ''}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="sticky bottom-4 bg-white border border-slate-200 rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-slate-600">
          <span className="font-bold text-slate-900">{attendedCount}</span> ordinands will receive the survey.
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/admin/events/${eventId}/survey`}
            className="text-sm font-bold uppercase tracking-wider text-blue-700 hover:text-blue-900"
          >
            Next: Survey →
          </Link>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : 'Save attendance'}
          </button>
        </div>
      </div>
    </div>
  )
}
