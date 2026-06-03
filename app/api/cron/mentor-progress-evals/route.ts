// app/api/cron/mentor-progress-evals/route.ts
// Daily job for the two early mentor "progress check-ins" (rounds 1 & 2).
// Spec: Specs/cmd-mentor-progress-evaluations-spec.md
//
// Each run:
//   1. Seeds future check-in rows from each ordinand's cohort deadline D
//      (round 1 = D−23mo, round 2 = D−11mo). Past-dated rounds are skipped
//      (late entrants miss them); seeded due_dates are frozen thereafter.
//   2. Dispatches any scheduled row whose due_date has arrived, emailing the
//      mentor a tokenized form link (no login). Idempotent via status + the
//      UNIQUE(ordinand_id, round) constraint.
//
// The FINAL summative evaluation is NOT handled here (stays manual per spec).
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '../../../../lib/api-auth'
import { EMAIL_FROM } from '../../../../lib/config'
import { sendOne } from '../../../../lib/resend-send'
import { addMonths, reginaToday, buildCheckinEmail, ROUND_OFFSET_MONTHS, type ProgressRound } from '../../../../lib/mentor-progress'

const REPLY_TO = 'chris@canadianmidwest.ca'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  const today = reginaToday()

  // ── Eligible ordinands: active, non-demo, with a cohort deadline ──────────
  const { data: ordinands, error } = await serviceClient
    .from('profiles')
    .select('id, status, is_demo, roles, cohorts(assignment_due_date)')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const eligible = (ordinands ?? []).filter((p: any) => {
    const cohort = Array.isArray(p.cohorts) ? p.cohorts[0] : p.cohorts
    return p.roles?.includes('ordinand') && p.status !== 'deleted' && p.is_demo !== true && cohort?.assignment_due_date
  })

  // ── 1. Seed future scheduled rows (skip past → frozen, late-entrant rule) ──
  let seeded = 0
  for (const p of eligible) {
    const cohort = Array.isArray((p as any).cohorts) ? (p as any).cohorts[0] : (p as any).cohorts
    const D = cohort.assignment_due_date as string
    for (const round of [1, 2] as ProgressRound[]) {
      const dueDate = addMonths(D, ROUND_OFFSET_MONTHS[round])
      const { data: existing } = await serviceClient
        .from('mentor_progress_checkins').select('id').eq('ordinand_id', p.id).eq('round', round).maybeSingle()
      if (existing) continue
      if (dueDate < today) continue // past round → skip (no backfill)
      const { error: insErr } = await serviceClient
        .from('mentor_progress_checkins').insert({ ordinand_id: p.id, round, due_date: dueDate })
      if (!insErr) seeded++
    }
  }

  // ── 2. Dispatch due scheduled rows ────────────────────────────────────────
  const { data: due } = await serviceClient
    .from('mentor_progress_checkins')
    .select('id, ordinand_id, round, token, profiles!ordinand_id(first_name, full_name, mentor_name, mentor_email)')
    .eq('status', 'scheduled').lte('due_date', today)

  const results: Array<{ id: string; sent: boolean; reason?: string }> = []
  for (const row of due ?? []) {
    const prof: any = Array.isArray((row as any).profiles) ? (row as any).profiles[0] : (row as any).profiles
    const mentorEmail: string | null = prof?.mentor_email ?? null
    const ordinandName: string = prof?.full_name || prof?.first_name || 'your ordinand'
    if (!mentorEmail) { results.push({ id: row.id, sent: false, reason: 'no mentor email on file' }); continue }

    const { subject, html } = buildCheckinEmail({ ordinandName, round: row.round as ProgressRound, token: row.token })
    const to = prof?.mentor_name ? `${prof.mentor_name} <${mentorEmail}>` : mentorEmail
    const r = await sendOne({ from: EMAIL_FROM, to: [to], subject, html, reply_to: REPLY_TO }, resendKey)

    if (r.ok) {
      const now = new Date().toISOString()
      await serviceClient.from('mentor_progress_checkins')
        .update({ status: 'sent', sent_at: now, mentor_name: prof?.mentor_name ?? null, mentor_email: mentorEmail, updated_at: now })
        .eq('id', row.id)
      results.push({ id: row.id, sent: true })
    } else {
      results.push({ id: row.id, sent: false, reason: r.detail })
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), today, seeded, dispatched: results.filter(r => r.sent).length, results })
}
