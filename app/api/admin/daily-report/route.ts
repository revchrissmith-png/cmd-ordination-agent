// app/api/admin/daily-report/route.ts
// Generates and emails a 24-hour activity report to system.admin@canadianmidwest.ca
// Called daily at 08:00 CST (14:00 UTC) by a Vercel cron job defined in vercel.json.
// Protected by CRON_SECRET — Vercel injects this automatically for cron calls.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL, SITE_DOMAIN, EMAIL_FROM, ADMIN_EMAIL } from '../../../../lib/config'
import { fetchWithTimeout } from '../../../../utils/fetchWithTimeout'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  // ── Fetch last 24 hours of activity ──────────────────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: logs }, { data: feedback }] = await Promise.all([
    serviceClient
      .from('activity_logs')
      .select('event_type, page, metadata, created_at, profiles(first_name, last_name, email, roles)')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    serviceClient
      .from('feedback_reports')
      .select('type, title, description, user_name, user_email, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
  ])

  // ── Group activity by user ────────────────────────────────────────────────
  type UserEntry = {
    name: string
    email: string
    roles: string[]
    events: { event_type: string; page: string | null; created_at: string }[]
  }
  const byUser = new Map<string, UserEntry>()

  for (const log of (logs ?? [])) {
    const p = (log as any).profiles
    const key = p?.email ?? 'unknown'
    if (!byUser.has(key)) {
      byUser.set(key, {
        name:   p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'Unknown User',
        email:  p?.email ?? key,
        roles:  p?.roles ?? [],
        events: [],
      })
    }
    byUser.get(key)!.events.push({
      event_type: log.event_type,
      page:       log.page ?? null,
      created_at: log.created_at,
    })
  }

  const uniqueUsers  = byUser.size
  const totalEvents  = logs?.length ?? 0
  const feedbackCount = feedback?.length ?? 0

  // ── Date range label (CST = UTC-6) ───────────────────────────────────────
  function toCST(iso: string) {
    return new Date(iso).toLocaleString('en-CA', {
      timeZone: 'America/Regina',
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }
  const reportDate = new Date().toLocaleString('en-CA', {
    timeZone: 'America/Regina',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const windowStart = toCST(since)
  const windowEnd   = toCST(new Date().toISOString())

  // ── Event label mapping ───────────────────────────────────────────────────
  const EVENT_LABELS: Record<string, string> = {
    login:               'Signed in',
    ordinand_dashboard:  'Viewed ordinand dashboard',
    requirement_view:    'Viewed a requirement',
    submission:          'Submitted an assignment',
    study_agent:         'Used Pardington study agent',
    pardington:          'Used Pardington study agent',
    council_dashboard:   'Viewed council dashboard',
    grading_view:        'Opened a grading assignment',
    grade_submitted:     'Submitted a grade',
    process_guide:       'Viewed ordination process guide',
    profile_view:        'Viewed their profile',
    feedback_submitted:  'Submitted portal feedback',
  }

  function roleLabel(roles: string[]): string {
    if (roles.includes('admin')) return 'Admin'
    if (roles.includes('council')) return 'Council'
    return 'Ordinand'
  }

  // ── Build HTML ────────────────────────────────────────────────────────────
  const headerBg  = '#00426A'
  const lightBg   = '#F8FAFC'
  const borderClr = '#E2E8F0'

  let userRows = ''
  if (byUser.size === 0) {
    userRows = `<tr><td colspan="3" style="padding:1rem;text-align:center;color:#64748B;font-style:italic;">No portal activity recorded in this period.</td></tr>`
  } else {
    for (const u of Array.from(byUser.values())) {
      const eventList = u.events
        .map(ev => `<li style="margin:0.2rem 0;color:#334155;font-size:0.85rem;">${toCST(ev.created_at)} — ${EVENT_LABELS[ev.event_type] ?? ev.event_type}${ev.page ? ` <span style="color:#94A3B8;font-size:0.8rem;">(${ev.page})</span>` : ''}</li>`)
        .join('')
      userRows += `
        <tr style="border-bottom:1px solid ${borderClr};">
          <td style="padding:0.85rem 1rem;vertical-align:top;">
            <strong style="color:#0F172A;">${u.name}</strong><br>
            <span style="color:#64748B;font-size:0.82rem;">${u.email}</span>
          </td>
          <td style="padding:0.85rem 1rem;vertical-align:top;">
            <span style="background:#EFF6FF;color:#1D4ED8;border-radius:4px;padding:0.15rem 0.5rem;font-size:0.78rem;font-weight:600;">${roleLabel(u.roles)}</span>
          </td>
          <td style="padding:0.85rem 1rem;vertical-align:top;">
            <ul style="margin:0;padding-left:1.1rem;">${eventList}</ul>
          </td>
        </tr>`
    }
  }

  let feedbackRows = ''
  if (feedbackCount === 0) {
    feedbackRows = `<tr><td colspan="3" style="padding:0.75rem 1rem;color:#64748B;font-style:italic;">No feedback submitted in this period.</td></tr>`
  } else {
    for (const f of (feedback ?? [])) {
      const badge = f.type === 'bug'
        ? `<span style="background:#FEF2F2;color:#B91C1C;border-radius:4px;padding:0.15rem 0.5rem;font-size:0.78rem;font-weight:600;">🐛 Bug</span>`
        : `<span style="background:#F0FDF4;color:#15803D;border-radius:4px;padding:0.15rem 0.5rem;font-size:0.78rem;font-weight:600;">✨ Feature</span>`
      feedbackRows += `
        <tr style="border-bottom:1px solid ${borderClr};">
          <td style="padding:0.75rem 1rem;vertical-align:top;">${badge}</td>
          <td style="padding:0.75rem 1rem;vertical-align:top;font-weight:600;color:#0F172A;">${f.title}</td>
          <td style="padding:0.75rem 1rem;vertical-align:top;color:#475569;font-size:0.85rem;">${f.description.replace(/\n/g, '<br>')}</td>
        </tr>
        <tr style="border-bottom:1px solid ${borderClr};background:${lightBg};">
          <td colspan="3" style="padding:0.3rem 1rem 0.6rem;color:#94A3B8;font-size:0.8rem;">
            From: ${f.user_name ?? 'Unknown'} (${f.user_email ?? '—'}) · ${toCST(f.created_at)}
          </td>
        </tr>`
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F1F5F9;">

<div style="max-width:700px;margin:2rem auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.12);">

  <!-- Header -->
  <div style="background:${headerBg};padding:1.5rem 2rem;">
    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:0.8rem;letter-spacing:0.05em;text-transform:uppercase;">Canadian Midwest District</p>
    <h1 style="margin:0.25rem 0 0;color:#fff;font-size:1.35rem;font-weight:800;">Ordination Portal — Daily Activity Report</h1>
    <p style="margin:0.5rem 0 0;color:rgba(255,255,255,0.75);font-size:0.85rem;">${reportDate}</p>
  </div>

  <!-- Summary bar -->
  <div style="background:#F8FAFC;border-bottom:1px solid ${borderClr};padding:1rem 2rem;display:flex;gap:2rem;flex-wrap:wrap;">
    <div><span style="font-size:1.6rem;font-weight:800;color:${headerBg};">${uniqueUsers}</span><br><span style="font-size:0.8rem;color:#64748B;">unique users</span></div>
    <div><span style="font-size:1.6rem;font-weight:800;color:${headerBg};">${totalEvents}</span><br><span style="font-size:0.8rem;color:#64748B;">logged events</span></div>
    <div><span style="font-size:1.6rem;font-weight:800;color:${feedbackCount > 0 ? '#B91C1C' : headerBg};">${feedbackCount}</span><br><span style="font-size:0.8rem;color:#64748B;">feedback reports</span></div>
    <div style="margin-left:auto;text-align:right;"><span style="font-size:0.8rem;color:#94A3B8;">Period</span><br><span style="font-size:0.8rem;color:#475569;">${windowStart} – ${windowEnd} CST</span></div>
  </div>

  <!-- Activity section -->
  <div style="padding:1.5rem 2rem 0;">
    <h2 style="margin:0 0 0.75rem;font-size:1rem;font-weight:700;color:#0F172A;">Portal Activity</h2>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
    <thead>
      <tr style="background:${lightBg};border-bottom:2px solid ${borderClr};">
        <th style="padding:0.6rem 1rem;text-align:left;font-size:0.78rem;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;width:28%;">User</th>
        <th style="padding:0.6rem 1rem;text-align:left;font-size:0.78rem;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;width:12%;">Role</th>
        <th style="padding:0.6rem 1rem;text-align:left;font-size:0.78rem;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Actions</th>
      </tr>
    </thead>
    <tbody>${userRows}</tbody>
  </table>

  <!-- Feedback section -->
  <div style="padding:1.5rem 2rem 0;margin-top:0.5rem;">
    <h2 style="margin:0 0 0.75rem;font-size:1rem;font-weight:700;color:#0F172A;">Feedback Reports</h2>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:1.5rem;">
    <thead>
      <tr style="background:${lightBg};border-bottom:2px solid ${borderClr};">
        <th style="padding:0.6rem 1rem;text-align:left;font-size:0.78rem;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;width:12%;">Type</th>
        <th style="padding:0.6rem 1rem;text-align:left;font-size:0.78rem;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;width:30%;">Subject</th>
        <th style="padding:0.6rem 1rem;text-align:left;font-size:0.78rem;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Details</th>
      </tr>
    </thead>
    <tbody>${feedbackRows}</tbody>
  </table>

  <!-- Footer -->
  <div style="background:${lightBg};border-top:1px solid ${borderClr};padding:1rem 2rem;text-align:center;">
    <p style="margin:0;font-size:0.78rem;color:#94A3B8;">
      This report is generated automatically each day at 8:00 AM CST.<br>
      CMD Ordination Portal · <a href="${SITE_URL}" style="color:#0077C8;">${SITE_DOMAIN}</a>
    </p>
  </div>

</div>
</body>
</html>`

  // ── Send via Resend ───────────────────────────────────────────────────────
  const subjectLine = uniqueUsers === 0
    ? `Ordination Portal — No Activity ${reportDate}`
    : `Ordination Portal — ${uniqueUsers} user${uniqueUsers !== 1 ? 's' : ''} active · ${reportDate}`

  const resendRes = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    timeoutMs: 15_000,
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    EMAIL_FROM,
      to:      [ADMIN_EMAIL],
      subject: subjectLine,
      html,
    }),
  })

  if (!resendRes.ok) {
    const detail = await resendRes.text()
    console.error('Resend error:', detail)
    return NextResponse.json({ sent: false, detail }, { status: 500 })
  }

  return NextResponse.json({ sent: true, uniqueUsers, totalEvents, feedbackCount })
}
