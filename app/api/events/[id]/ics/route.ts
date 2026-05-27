// app/api/events/[id]/ics/route.ts
// Download an .ics file for a single cohort event.
//
// Auth: session cookie (the link is rendered inside the authenticated
// dashboard, hit via a plain <a href>). RLS on cohort_events keeps an
// authenticated user from pulling an event their cohort can't see.
//
// Timezone: stored event_time is Regina wall-clock (CST year-round, no DST).
// We emit a VTIMEZONE block declaring America/Regina with the static
// UTC-06:00 offset so every major calendar resolves the time correctly
// regardless of viewer location or DST state.
//
// Location handling mirrors the dashboard's smart link rendering: if
// location parses as an http(s) URL we surface it as both URL: and
// LOCATION: (calendar apps render URLs in LOCATION as click-to-join).

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isValidUUID } from '../../../../../lib/api-auth'

function escape(text: string): string {
  // RFC 5545 §3.3.11 — backslash, semicolon, comma, and newlines must be escaped.
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function fold(line: string): string {
  // RFC 5545 §3.1 — lines over 75 octets must be folded with CRLF + space.
  const out: string[] = []
  let remaining = line
  while (remaining.length > 75) {
    out.push(remaining.slice(0, 75))
    remaining = ' ' + remaining.slice(75)
  }
  out.push(remaining)
  return out.join('\r\n')
}

function formatLocalDt(date: string, time: string | null): string {
  // YYYYMMDDTHHMMSS in floating local time, paired with TZID.
  const [y, m, d] = date.split('-')
  const t = time ? time.slice(0, 8).replace(/:/g, '') : '000000'
  // Postgres `time` may come back as HH:MM:SS — pad if shorter.
  return `${y}${m}${d}T${t.padEnd(6, '0')}`
}

function formatUtcStamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUUID(params.id)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* no-op: this is a read-only GET */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: ev, error } = await supabase
    .from('cohort_events')
    .select('id, title, event_date, event_time, location, notes')
    .eq('id', params.id)
    .single()

  if (error || !ev) {
    // RLS denial returns no row — present as 404 either way.
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // 1-hour default duration when no end time is configured; covers the
  // common case of a one-hour Zoom block without adding another field.
  const dtStart = formatLocalDt(ev.event_date, ev.event_time)
  const endHourOffset = ev.event_time ? 1 : 0
  let endTime = ev.event_time
  if (ev.event_time) {
    const [h, m] = ev.event_time.split(':').map((x: string) => parseInt(x, 10))
    const endH = (h + endHourOffset) % 24
    endTime = `${endH.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}:00`
  }
  const dtEnd = ev.event_time
    ? formatLocalDt(ev.event_date, endTime)
    : formatLocalDt(ev.event_date, '23:59:00')

  const locationIsUrl = ev.location && /^https?:\/\//i.test(ev.location)
  const description = [
    ev.notes?.trim(),
    locationIsUrl ? `Meeting link: ${ev.location}` : null,
    'Stored in the CMD Ordination Portal. Times shown in Regina (Central) time.',
  ].filter(Boolean).join('\n\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CMD Ordination Portal//Cohort Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Regina TZ block — fixed UTC-06:00 offset since Saskatchewan does not
    // observe DST. Calendar apps respect this regardless of viewer locale.
    'BEGIN:VTIMEZONE',
    'TZID:America/Regina',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0600',
    'TZNAME:CST',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${ev.id}@cmd-ordination-portal`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    ev.event_time
      ? `DTSTART;TZID=America/Regina:${dtStart}`
      : `DTSTART;VALUE=DATE:${dtStart.slice(0, 8)}`,
    ev.event_time
      ? `DTEND;TZID=America/Regina:${dtEnd}`
      : `DTEND;VALUE=DATE:${dtStart.slice(0, 8)}`,
    fold(`SUMMARY:${escape(ev.title)}`),
    ev.location ? fold(`LOCATION:${escape(ev.location)}`) : null,
    locationIsUrl ? fold(`URL:${escape(ev.location)}`) : null,
    description ? fold(`DESCRIPTION:${escape(description)}`) : null,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].filter(Boolean)

  const body = lines.join('\r\n')
  const filename = `cmd-event-${ev.id.slice(0, 8)}.ics`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
