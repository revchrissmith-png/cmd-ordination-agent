// app/api/cron/weekly-digest/route.ts
// Weekly digest email for the CMD Ordination Portal.
// Vercel Cron fires this every Monday at 13:00 UTC (= 7:00 AM Regina, CST year-round).
// Replaces the daily activity-report cron job.
//
// Recipients: ADMIN_EMAIL (Chris) + DIGEST_CC_EMAIL env var (Michelle, when confirmed).
//
// Five sections:
//   1. Assignments submitted in the past 7 days
//   2. Assignments graded in the past 7 days
//   3. Ordinands / council members not logged in for 30+ days
//   4. Submissions awaiting a grade for 60+ days (critically overdue)
//   5. Ordinands with no mentor report submitted in 60+ days
//
// Auth: Vercel Cron injects Authorization: Bearer $CRON_SECRET.
//       Admin callers may POST to manually trigger (recovery path).
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient } from '../../../../lib/api-auth'
import { EMAIL_FROM, ADMIN_EMAIL, SITE_URL } from '../../../../lib/config'
import { sendOne } from '../../../../lib/resend-send'

// ── Time windows ─────────────────────────────────────────────────────────────

function reginaNow(): Date {
  return new Date()
}

function isoAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function reginaDate(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Regina',
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// ── Data types ────────────────────────────────────────────────────────────────

type SubmittedRow = {
  ordinandName: string
  requirementTitle: string
  submittedAt: string
}

type GradedRow = {
  ordinandName: string
  graderName: string
  requirementTitle: string
  gradedAt: string
}

type InactiveRow = {
  name: string
  email: string
  role: string
}

type OverdueRow = {
  ordinandName: string
  requirementTitle: string
  submittedAt: string
  daysWaiting: number
}

type NoReportRow = {
  name: string
  email: string
}

type DigestData = {
  submitted: SubmittedRow[]
  graded: GradedRow[]
  inactive: InactiveRow[]
  overdue: OverdueRow[]
  noReport: NoReportRow[]
}

// ── Query helpers ─────────────────────────────────────────────────────────────

async function getRequirementTitles(reqIds: string[]): Promise<Map<string, string>> {
  if (reqIds.length === 0) return new Map()
  const { data } = await serviceClient
    .from('ordinand_requirements')
    .select('id, custom_title, requirement_templates(title)')
    .in('id', reqIds)
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    const rt = Array.isArray(row.requirement_templates)
      ? row.requirement_templates[0]
      : row.requirement_templates
    map.set(row.id, (rt as any)?.title ?? row.custom_title ?? 'Unknown requirement')
  }
  return map
}

async function getProfileNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const { data } = await serviceClient
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', ids)
  const map = new Map<string, string>()
  for (const p of data ?? []) {
    map.set(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown')
  }
  return map
}

// ── Section queries ───────────────────────────────────────────────────────────

async function querySubmittedThisWeek(): Promise<SubmittedRow[]> {
  const since = isoAgo(7)
  const { data: subs } = await serviceClient
    .from('submissions')
    .select('submitted_at, ordinand_id, ordinand_requirement_id')
    .gte('submitted_at', since)
    .order('submitted_at', { ascending: false })

  if (!subs?.length) return []

  const reqIds = Array.from(new Set(subs.map(s => s.ordinand_requirement_id)))
  const ordinandIds = Array.from(new Set(subs.map(s => s.ordinand_id)))

  const [reqTitles, names] = await Promise.all([
    getRequirementTitles(reqIds),
    getProfileNames(ordinandIds),
  ])

  // Exclude demo and soft-deleted accounts (match admin console: is_demo=false, status<>'deleted')
  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, is_demo, status')
    .in('id', ordinandIds)
  const excludeIds = new Set(
    (profiles ?? []).filter((p: any) => p.is_demo || p.status === 'deleted').map((p: any) => p.id)
  )

  return subs
    .filter(s => !excludeIds.has(s.ordinand_id))
    .map(s => ({
      ordinandName:     names.get(s.ordinand_id) ?? 'Unknown',
      requirementTitle: reqTitles.get(s.ordinand_requirement_id) ?? 'Unknown',
      submittedAt:      s.submitted_at,
    }))
}

async function queryGradedThisWeek(): Promise<GradedRow[]> {
  const since = isoAgo(7)
  const { data: grades } = await serviceClient
    .from('grades')
    .select('graded_at, graded_by, grading_assignment_id')
    .gte('graded_at', since)
    .eq('is_draft', false)
    .order('graded_at', { ascending: false })

  if (!grades?.length) return []

  const gaIds = Array.from(new Set(grades.map(g => g.grading_assignment_id)))
  const { data: gasRaw } = await serviceClient
    .from('grading_assignments')
    .select('id, ordinand_requirement_id, ordinand_requirements(ordinand_id)')
    .in('id', gaIds)

  // Build maps
  const gaToReqId = new Map<string, string>()
  const gaToOrdinandId = new Map<string, string>()
  for (const ga of gasRaw ?? []) {
    gaToReqId.set(ga.id, ga.ordinand_requirement_id)
    const ore = Array.isArray(ga.ordinand_requirements)
      ? ga.ordinand_requirements[0]
      : ga.ordinand_requirements
    if (ore) gaToOrdinandId.set(ga.id, (ore as any).ordinand_id)
  }

  const reqIds = Array.from(new Set(gaToReqId.values()))
  const ordinandIds = Array.from(new Set(gaToOrdinandId.values()))
  const graderIds = Array.from(new Set(grades.map(g => g.graded_by)))
  const allProfileIds = Array.from(new Set([...ordinandIds, ...graderIds]))

  const [reqTitles, names] = await Promise.all([
    getRequirementTitles(reqIds),
    getProfileNames(allProfileIds),
  ])

  // Exclude demo and soft-deleted ordinands
  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, is_demo, status')
    .in('id', ordinandIds)
  const excludeIds = new Set(
    (profiles ?? []).filter((p: any) => p.is_demo || p.status === 'deleted').map((p: any) => p.id)
  )

  return grades
    .filter(g => {
      const ordinandId = gaToOrdinandId.get(g.grading_assignment_id)
      return ordinandId && !excludeIds.has(ordinandId)
    })
    .map(g => {
      const reqId = gaToReqId.get(g.grading_assignment_id) ?? ''
      const ordinandId = gaToOrdinandId.get(g.grading_assignment_id) ?? ''
      return {
        ordinandName:     names.get(ordinandId) ?? 'Unknown',
        graderName:       names.get(g.graded_by) ?? 'Unknown',
        requirementTitle: reqTitles.get(reqId) ?? 'Unknown',
        gradedAt:         g.graded_at,
      }
    })
}

async function queryInactiveUsers(): Promise<InactiveRow[]> {
  const since30 = isoAgo(30)

  const { data: candidates } = await serviceClient
    .from('profiles')
    .select('id, first_name, last_name, email, roles')
    .overlaps('roles', ['ordinand', 'council'])
    .eq('is_demo', false)
    .neq('status', 'deleted')

  if (!candidates?.length) return []

  // IDs that have any activity in the past 30 days
  const { data: recentActivity } = await serviceClient
    .from('activity_logs')
    .select('user_id')
    .in('user_id', candidates.map((c: any) => c.id))
    .gte('created_at', since30)

  const recentSet = new Set((recentActivity ?? []).map((r: any) => r.user_id))

  function primaryRole(roles: string[]): string {
    if (roles.includes('council')) return 'Council'
    if (roles.includes('ordinand')) return 'Ordinand'
    return roles[0] ?? 'Unknown'
  }

  return (candidates as any[])
    .filter(c => !recentSet.has(c.id))
    .map(c => ({
      name:  `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unknown',
      email: c.email ?? '',
      role:  primaryRole(c.roles ?? []),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function queryCriticallyOverdue(): Promise<OverdueRow[]> {
  const since60 = isoAgo(60)

  // Source of truth for "awaiting council action" is the requirement status —
  // not the grades table. A requirement marked complete/waived/revision_required
  // is NOT overdue, even if an old submission row still exists. (Deriving this
  // from grades produced false positives for complete-but-not-grade-rowed and
  // waived requirements.)
  const { data: pendingReqs } = await serviceClient
    .from('ordinand_requirements')
    .select('id, ordinand_id')
    .in('status', ['submitted', 'under_review'])

  if (!pendingReqs?.length) return []

  const reqIds = pendingReqs.map(r => r.id)
  const { data: subs } = await serviceClient
    .from('submissions')
    .select('ordinand_requirement_id, submitted_at')
    .in('ordinand_requirement_id', reqIds)

  if (!subs?.length) return []

  // Most recent submission per requirement = the one council is sitting on
  const latestByReq = new Map<string, string>()
  for (const s of subs) {
    const prev = latestByReq.get(s.ordinand_requirement_id)
    if (!prev || s.submitted_at > prev) latestByReq.set(s.ordinand_requirement_id, s.submitted_at)
  }

  // Keep requirements whose latest submission has been waiting 60+ days
  const overdueReqs = pendingReqs.filter(r => {
    const latest = latestByReq.get(r.id)
    return latest != null && latest < since60
  })
  if (!overdueReqs.length) return []

  // Exclude demo and soft-deleted ordinands
  const ordinandIds = Array.from(new Set(overdueReqs.map(r => r.ordinand_id)))
  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, is_demo, status')
    .in('id', ordinandIds)
  const excludeIds = new Set(
    (profiles ?? []).filter((p: any) => p.is_demo || p.status === 'deleted').map((p: any) => p.id)
  )

  const visibleReqs = overdueReqs.filter(r => !excludeIds.has(r.ordinand_id))
  if (!visibleReqs.length) return []

  const [reqTitles, names] = await Promise.all([
    getRequirementTitles(visibleReqs.map(r => r.id)),
    getProfileNames(Array.from(new Set(visibleReqs.map(r => r.ordinand_id)))),
  ])

  return visibleReqs
    .map(r => {
      const submittedAt = latestByReq.get(r.id)!
      return {
        ordinandName:     names.get(r.ordinand_id) ?? 'Unknown',
        requirementTitle: reqTitles.get(r.id) ?? 'Unknown',
        submittedAt,
        daysWaiting:      daysSince(submittedAt),
      }
    })
    .sort((a, b) => b.daysWaiting - a.daysWaiting)
}

async function queryNoMentorReport(): Promise<NoReportRow[]> {
  const since60 = isoAgo(60)

  const { data: ordinands } = await serviceClient
    .from('profiles')
    .select('id, first_name, last_name, email')
    .contains('roles', ['ordinand'])
    .eq('is_demo', false)
    .neq('status', 'deleted')

  if (!ordinands?.length) return []

  const { data: recentReports } = await serviceClient
    .from('mentor_reports')
    .select('ordinand_id')
    .in('ordinand_id', ordinands.map((o: any) => o.id))
    .gte('submitted_at', since60)
    .eq('is_draft', false)

  const recentSet = new Set((recentReports ?? []).map((r: any) => r.ordinand_id))

  return (ordinands as any[])
    .filter(o => !recentSet.has(o.id))
    .map(o => ({
      name:  `${o.first_name ?? ''} ${o.last_name ?? ''}`.trim() || 'Unknown',
      email: o.email ?? '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── HTML builder ──────────────────────────────────────────────────────────────

const DEEP_SEA      = '#00426A'
const ALLIANCE_BLUE = '#0077C8'
const LIGHT_BG      = '#F8FAFC'
const BORDER        = '#E2E8F0'
const TEXT_MUTED    = '#64748B'
const TEXT_BODY     = '#334155'

function sectionHeader(title: string, count: number, alertWhen = false): string {
  const dot = alertWhen && count > 0
    ? `<span style="display:inline-block;width:8px;height:8px;background:#DC2626;border-radius:50%;margin-left:6px;vertical-align:middle;"></span>`
    : ''
  return `<h2 style="margin:24px 0 8px;font-size:14px;font-weight:700;color:${DEEP_SEA};letter-spacing:0.04em;text-transform:uppercase;">${title}${dot} <span style="font-weight:400;color:${TEXT_MUTED};font-size:13px;">(${count})</span></h2>`
}

function tableWrap(headRow: string, bodyRows: string): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
  <thead><tr style="background:${LIGHT_BG};border-bottom:2px solid ${BORDER};">${headRow}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>`
}

function th(label: string, width = ''): string {
  return `<th style="padding:7px 12px;text-align:left;font-size:11px;color:${TEXT_MUTED};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;${width ? `width:${width};` : ''}">${label}</th>`
}

function td(content: string, muted = false): string {
  return `<td style="padding:8px 12px;color:${muted ? TEXT_MUTED : TEXT_BODY};border-bottom:1px solid ${BORDER};">${content}</td>`
}

function emptyRow(cols: number, message: string): string {
  return `<tr><td colspan="${cols}" style="padding:12px;text-align:center;color:${TEXT_MUTED};font-style:italic;font-size:13px;">${message}</td></tr>`
}

function buildHtml(data: DigestData, reportDateStr: string): string {
  // Section 1
  const s1rows = data.submitted.length
    ? data.submitted.map(r =>
        `<tr>${td(r.ordinandName)}${td(r.requirementTitle)}${td(reginaDate(r.submittedAt), true)}</tr>`
      ).join('')
    : emptyRow(3, 'No assignments submitted this week.')
  const s1 = sectionHeader('Submitted This Week', data.submitted.length) +
    tableWrap(
      th('Ordinand', '28%') + th('Requirement') + th('Date', '18%'),
      s1rows
    )

  // Section 2
  const s2rows = data.graded.length
    ? data.graded.map(r =>
        `<tr>${td(r.ordinandName)}${td(r.requirementTitle)}${td(r.graderName, true)}${td(reginaDate(r.gradedAt), true)}</tr>`
      ).join('')
    : emptyRow(4, 'No assignments graded this week.')
  const s2 = sectionHeader('Graded This Week', data.graded.length) +
    tableWrap(
      th('Ordinand', '25%') + th('Requirement') + th('Grader', '18%') + th('Date', '15%'),
      s2rows
    )

  // Section 3
  const s3rows = data.inactive.length
    ? data.inactive.map(r =>
        `<tr>${td(r.name)}${td(r.role, true)}${td(r.email, true)}</tr>`
      ).join('')
    : emptyRow(3, 'Everyone has logged in within the past 30 days.')
  const s3 = sectionHeader('Not Logged In — 30+ Days', data.inactive.length) +
    tableWrap(
      th('Name', '30%') + th('Role', '15%') + th('Email'),
      s3rows
    )

  // Section 4 — alert badge if anything here
  const s4rows = data.overdue.length
    ? data.overdue.map(r =>
        `<tr>${td(r.ordinandName)}${td(r.requirementTitle)}${td(reginaDate(r.submittedAt), true)}${td(`<strong style="color:#B91C1C;">${r.daysWaiting}d</strong>`)}</tr>`
      ).join('')
    : emptyRow(4, 'No critically overdue submissions.')
  const s4 = sectionHeader('Critically Overdue — Ungraded 60+ Days', data.overdue.length, true) +
    tableWrap(
      th('Ordinand', '25%') + th('Requirement') + th('Submitted', '18%') + th('Waiting', '12%'),
      s4rows
    )

  // Section 5 — alert badge if anything here
  const s5rows = data.noReport.length
    ? data.noReport.map(r =>
        `<tr>${td(r.name)}${td(r.email, true)}</tr>`
      ).join('')
    : emptyRow(2, 'All ordinands have a mentor report within the past 60 days.')
  const s5 = sectionHeader('No Mentor Report — 60+ Days', data.noReport.length, true) +
    tableWrap(
      th('Ordinand', '40%') + th('Email'),
      s5rows
    )

  // Summary bar counts
  const hasAlerts = data.overdue.length > 0 || data.noReport.length > 0
  const alertBadge = hasAlerts
    ? `<span style="background:#FEF2F2;color:#B91C1C;border-radius:4px;padding:3px 8px;font-size:12px;font-weight:700;margin-left:12px;">⚠ Action needed</span>`
    : `<span style="background:#F0FDF4;color:#15803D;border-radius:4px;padding:3px 8px;font-size:12px;font-weight:700;margin-left:12px;">All clear</span>`

  function stat(value: number, label: string, alert = false): string {
    const color = alert && value > 0 ? '#B91C1C' : DEEP_SEA
    return `<div style="text-align:center;">
      <div style="font-size:22px;font-weight:800;color:${color};">${value}</div>
      <div style="font-size:11px;color:${TEXT_MUTED};">${label}</div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F1F5F9;">
<div style="max-width:680px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.10);">

  <!-- Header -->
  <div style="background:${DEEP_SEA};padding:20px 28px;">
    <p style="margin:0;color:rgba(255,255,255,0.65);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Canadian Midwest District</p>
    <h1 style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:800;">Ordination Portal — Weekly Digest</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">${reportDateStr}${alertBadge}</p>
  </div>

  <!-- Summary bar -->
  <div style="background:${LIGHT_BG};border-bottom:1px solid ${BORDER};padding:16px 28px;display:flex;gap:0;justify-content:space-between;">
    ${stat(data.submitted.length, 'submitted')}
    ${stat(data.graded.length, 'graded')}
    ${stat(data.inactive.length, 'inactive 30d')}
    ${stat(data.overdue.length, 'overdue 60d', true)}
    ${stat(data.noReport.length, 'no report 60d', true)}
  </div>

  <!-- Sections -->
  <div style="padding:8px 28px 24px;">
    ${s1}
    ${s2}
    ${s3}
    ${s4}
    ${s5}
  </div>

  <!-- Footer -->
  <div style="background:${LIGHT_BG};border-top:1px solid ${BORDER};padding:14px 28px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94A3B8;">
      Sent every Monday at 7:00 AM Regina time &middot;
      <a href="${SITE_URL}/admin" style="color:${ALLIANCE_BLUE};">Open Admin Portal</a>
    </p>
  </div>

</div>
</body>
</html>`
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function runDigest(resendKey: string, triggeredBy: string) {
  const [submitted, graded, inactive, overdue, noReport] = await Promise.all([
    querySubmittedThisWeek(),
    queryGradedThisWeek(),
    queryInactiveUsers(),
    queryCriticallyOverdue(),
    queryNoMentorReport(),
  ])

  const data: DigestData = { submitted, graded, inactive, overdue, noReport }

  const now = reginaNow()
  const reportDateStr = now.toLocaleString('en-CA', {
    timeZone: 'America/Regina',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const html = buildHtml(data, reportDateStr)

  const hasAlerts = overdue.length > 0 || noReport.length > 0
  const subject = hasAlerts
    ? `Ordination Portal Weekly Digest — ${overdue.length + noReport.length} item${overdue.length + noReport.length !== 1 ? 's' : ''} need attention · ${reportDateStr}`
    : `Ordination Portal Weekly Digest — ${reportDateStr}`

  // Recipients: always Chris; optionally Michelle if her address is set
  const toAddresses = [ADMIN_EMAIL]
  const ccEmail = process.env.DIGEST_CC_EMAIL?.trim()
  if (ccEmail) toAddresses.push(ccEmail)

  const result = await sendOne(
    { from: EMAIL_FROM, to: toAddresses, subject, html },
    resendKey,
  )

  return { triggeredBy, firedAt: now.toISOString(), data: {
    submitted: submitted.length,
    graded: graded.length,
    inactive: inactive.length,
    overdue: overdue.length,
    noReport: noReport.length,
  }, sent: result.ok, ...(result.ok ? {} : { sendError: (result as any).detail }) }
}

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

  const summary = await runDigest(resendKey, 'cron')
  return NextResponse.json(summary, { status: summary.sent ? 200 : 500 })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const summary = await runDigest(resendKey, `admin:${auth.user!.email}`)
  return NextResponse.json(summary, { status: summary.sent ? 200 : 500 })
}
