// app/api/cron/dispatch-surveys/route.ts
// Daily sweep (08:00 Regina / 14:00 UTC): dispatch every cohort_event_surveys
// row whose send_at has passed and sent_at is still NULL. Daily cadence is
// the floor of all Vercel plan tiers; finer scheduling can use the Send-now
// admin button.
//
// Idempotent — dispatchSurvey() short-circuits on already-sent surveys
// and on already-sent invitations, so re-runs are safe.
//
// Auth: GET requires Vercel cron secret; POST is the admin recovery path.
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient } from '../../../../lib/api-auth'
import { dispatchSurvey } from '../../../../lib/survey-dispatch'

async function runSweep(): Promise<NextResponse> {
  const nowIso = new Date().toISOString()
  const { data: due, error } = await serviceClient
    .from('cohort_event_surveys')
    .select('id, event_id, send_at')
    .is('sent_at', null)
    .not('send_at', 'is', null)
    .lte('send_at', nowIso)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<Record<string, unknown>> = []
  for (const row of due ?? []) {
    const r = await dispatchSurvey(row.id)
    results.push({ survey_id: row.id, ...r })
  }
  return NextResponse.json({ ranAt: nowIso, count: due?.length ?? 0, results })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSweep()
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error
  return runSweep()
}
