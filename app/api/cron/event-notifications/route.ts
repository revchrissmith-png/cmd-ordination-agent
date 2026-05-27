// app/api/cron/event-notifications/route.ts
// Daily sweep that fires the three council-driven cohort-event reminders:
//
//   T-50 → council assignees: Michelle needs your event-detail updates
//          within two weeks
//   T-30 → cohort ordinands: upcoming event, expected attendance
//   T-3  → council + ordinands: warm reminder of what's coming up
//
// Vercel Cron hits this once a day. Each (event, kind) pair is logged in
// cohort_event_notifications_sent with a UNIQUE constraint, so re-runs
// (manual retry, cron double-fire, recovery) never double-send.
//
// Auth: Vercel Cron injects Authorization: Bearer $CRON_SECRET. Admins
// may POST manually as a recovery path (same role check used by other
// cron routes in this repo).
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient } from '../../../../lib/api-auth'
import { EMAIL_FROM, SITE_URL } from '../../../../lib/config'
import { wrapEmail, emailButton, emailInfoBlock } from '../../../../lib/email-templates'
import { sendMany, type EmailPayload } from '../../../../lib/resend-send'

type Kind = 't50_council' | 't30_ordinand' | 't3_all'

type EventRow = {
  id: string
  title: string
  event_date: string         // YYYY-MM-DD
  event_time: string | null  // HH:MM:SS, Regina wall-clock
  event_type: 'online' | 'in_person'
  location: string | null
  notes: string | null
  cohort_ids: string[] | null
  team: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Today's date in Regina (Central) as YYYY-MM-DD. SK doesn't observe DST,
 *  so the offset is a constant -06:00 — formatting via toLocaleDateString
 *  with the IANA zone keeps the boundary deterministic. */
function reginaToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Regina',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatTime12(t: string | null): string {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatLongDate(iso: string): string {
  // Render the stored date as Regina wall-clock (noon-anchored so UTC midnight
  // never rolls back a day for SK/MB viewers).
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatDateTimeLine(ev: EventRow): string {
  const dateStr = formatLongDate(ev.event_date)
  return ev.event_time
    ? `${dateStr} · ${formatTime12(ev.event_time)} CST (Regina time)`
    : dateStr
}

function locationLine(ev: EventRow): string {
  if (!ev.location) return ''
  const isUrl = /^https?:\/\//i.test(ev.location)
  if (isUrl) {
    return `<p style="color:#475569;font-size:14px;margin:8px 0;"><strong>Meeting link:</strong> <a href="${ev.location}" style="color:#0077C8;">${ev.location}</a></p>`
  }
  return `<p style="color:#475569;font-size:14px;margin:8px 0;"><strong>Location:</strong> ${ev.location}</p>`
}

// ── Email templates ──────────────────────────────────────────────────────────

function tmplT50Council(ev: EventRow): { subject: string; html: string } {
  const subject = `Council prep needed: ${ev.title} (${formatLongDate(ev.event_date)})`
  const body = `
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">Hello Council,</p>
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">
      The following cohort event is approximately fifty days away. Michelle needs to finalise the details that ordinands will see, and is asking for any updates or additions you'd like included <strong>within the next two weeks</strong>.
    </p>
    ${emailInfoBlock(`${ev.title}<br><span style="font-weight:normal;font-size:13px;">${formatDateTimeLine(ev)}</span>`)}
    ${locationLine(ev)}
    ${ev.notes ? `<p style="color:#475569;font-size:14px;margin:8px 0;"><strong>Current notes:</strong><br>${ev.notes.replace(/\n/g, '<br>')}</p>` : ''}
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:20px 0 8px;">
      Please review and send any updates to Michelle. If everything is already in order, no reply is needed.
    </p>
    ${emailButton(`${SITE_URL}/dashboard/admin`, 'Open the Admin Console')}
  `
  return { subject, html: wrapEmail(body) }
}

function tmplT30Ordinand(ev: EventRow): { subject: string; html: string } {
  const subject = `Upcoming cohort event: ${ev.title} (${formatLongDate(ev.event_date)})`
  const body = `
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">Hello,</p>
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">
      This is a reminder that the following cohort event is coming up in about thirty days:
    </p>
    ${emailInfoBlock(`${ev.title}<br><span style="font-weight:normal;font-size:13px;">${formatDateTimeLine(ev)}</span>`)}
    ${locationLine(ev)}
    ${ev.notes ? `<p style="color:#475569;font-size:14px;margin:8px 0;"><strong>Details:</strong><br>${ev.notes.replace(/\n/g, '<br>')}</p>` : ''}
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:20px 0 8px;">
      Attendance at cohort events is part of your ordination requirements. Without express permission from Chris, you are expected to attend.
    </p>
    ${emailButton(`${SITE_URL}/dashboard/ordinand`, 'Open Your Dashboard')}
  `
  return { subject, html: wrapEmail(body) }
}

function tmplT3All(ev: EventRow): { subject: string; html: string } {
  const subject = `This week: ${ev.title} (${formatLongDate(ev.event_date)})`
  const body = `
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">Hello,</p>
    <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Quick reminder that the following event is just three days away. We're looking forward to seeing you there.
    </p>
    ${emailInfoBlock(`${ev.title}<br><span style="font-weight:normal;font-size:13px;">${formatDateTimeLine(ev)}</span>`)}
    ${locationLine(ev)}
    ${ev.notes ? `<p style="color:#475569;font-size:14px;margin:8px 0;"><strong>Details:</strong><br>${ev.notes.replace(/\n/g, '<br>')}</p>` : ''}
  `
  return { subject, html: wrapEmail(body) }
}

// ── Recipient resolution ─────────────────────────────────────────────────────

async function councilRecipients(eventId: string): Promise<string[]> {
  // Per-event assignments first. If none exist for the event, fall back to all
  // council members — keeps un-assigned events from silently skipping the
  // T-50 prompt that surfaces Michelle's review window.
  const { data: assigns } = await serviceClient
    .from('cohort_event_council_assignments')
    .select('profiles:profile_id(email)')
    .eq('event_id', eventId)
  const assigned = (assigns ?? [])
    .map((row: any) => (Array.isArray(row.profiles) ? row.profiles[0]?.email : row.profiles?.email))
    .filter((e: string | null): e is string => !!e)
  if (assigned.length > 0) return assigned

  const { data: allCouncil } = await serviceClient
    .from('profiles')
    .select('email')
    .contains('roles', ['council'])
    .eq('is_demo', false)
  return (allCouncil ?? []).map(p => p.email).filter((e: string | null): e is string => !!e)
}

async function ordinandRecipients(cohortIds: string[] | null): Promise<string[]> {
  // cohort_ids null OR empty means "all cohorts" (admin chose All Cohorts).
  let q = serviceClient
    .from('profiles')
    .select('email')
    .contains('roles', ['ordinand'])
    .eq('is_demo', false)
    .neq('status', 'deleted')
  if (cohortIds && cohortIds.length > 0) {
    q = q.in('cohort_id', cohortIds)
  }
  const { data } = await q
  return (data ?? []).map(p => p.email).filter((e: string | null): e is string => !!e)
}

// ── Core sweep ───────────────────────────────────────────────────────────────

const KIND_OFFSETS: Record<Kind, number> = {
  t50_council:  50,
  t30_ordinand: 30,
  t3_all:       3,
}

async function runSweep(resendKey: string) {
  const today = reginaToday()
  const summary: Record<Kind, { event: string; recipients: number; ok: number; failed: number }[]> = {
    t50_council: [], t30_ordinand: [], t3_all: [],
  }

  for (const kind of Object.keys(KIND_OFFSETS) as Kind[]) {
    const targetDate = addDays(today, KIND_OFFSETS[kind])

    // Events on the target day that have NOT already been notified for this
    // kind. Left-join to the sent-log; keep rows where the log id is null.
    const { data: events } = await serviceClient
      .from('cohort_events')
      .select('id, title, event_date, event_time, event_type, location, notes, cohort_ids, team, cohort_event_notifications_sent(kind)')
      .eq('event_date', targetDate)

    for (const ev of (events ?? []) as any[]) {
      const alreadySent = (ev.cohort_event_notifications_sent ?? []).some((row: any) => row.kind === kind)
      if (alreadySent) continue

      // Decide recipients + template.
      let recipients: string[] = []
      let template: { subject: string; html: string }
      let replyTo: string | undefined

      const evRow: EventRow = ev
      if (kind === 't50_council') {
        recipients = await councilRecipients(ev.id)
        template = tmplT50Council(evRow)
        replyTo = process.env.EVENT_REPLY_TO_MICHELLE
      } else if (kind === 't30_ordinand') {
        recipients = await ordinandRecipients(ev.cohort_ids)
        template = tmplT30Ordinand(evRow)
        replyTo = process.env.EVENT_REPLY_TO_CHRIS
      } else {
        const [council, ordinands] = await Promise.all([
          councilRecipients(ev.id),
          ordinandRecipients(ev.cohort_ids),
        ])
        recipients = Array.from(new Set([...council, ...ordinands]))
        template = tmplT3All(evRow)
        replyTo = process.env.EVENT_REPLY_TO_MICHELLE
      }

      if (recipients.length === 0) {
        // Log a zero-recipient send so we don't retry endlessly.
        await serviceClient
          .from('cohort_event_notifications_sent')
          .insert({ event_id: ev.id, kind, recipient_count: 0 })
        summary[kind].push({ event: ev.title, recipients: 0, ok: 0, failed: 0 })
        continue
      }

      const payloads: EmailPayload[] = recipients.map(to => ({
        from: EMAIL_FROM,
        to: [to],
        subject: template.subject,
        html: template.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }))
      const results = await sendMany(payloads, resendKey)
      const ok = results.filter(r => r.ok).length
      const failed = results.length - ok

      // Insert log row only after sends complete. Idempotency guarantee is the
      // UNIQUE(event_id, kind) constraint — a second cron pass on the same day
      // will skip this event because alreadySent will be true.
      await serviceClient
        .from('cohort_event_notifications_sent')
        .insert({ event_id: ev.id, kind, recipient_count: ok })

      summary[kind].push({ event: ev.title, recipients: recipients.length, ok, failed })
    }
  }

  return { ranAt: new Date().toISOString(), today, summary }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const result = await runSweep(resendKey)
  return NextResponse.json(result)
}

/** Admin recovery path: same logic, but gated by role auth instead of cron secret. */
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const result = await runSweep(resendKey)
  return NextResponse.json(result)
}
