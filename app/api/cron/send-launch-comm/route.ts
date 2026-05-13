// app/api/cron/send-launch-comm/route.ts
// Sends one of the three launch-comms emails on its scheduled date.
// Vercel Cron fires this daily at 16:00 UTC (= 10:00 Regina, CST year-round).
// The route checks today's Regina date against the launch schedule and:
//   - 2026-05-14 → council_prep to admin+council
//   - 2026-05-15 → ordinand_prep to admin+ordinand
//   - 2026-06-01 → ordinand_go_live to admin+ordinand
//   - Any other date → 204 No Content (cron no-op).
//
// Auth: Vercel Cron injects `Authorization: Bearer $CRON_SECRET`. Admin
// callers may also POST to manually fire a specific key (recovery path).
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient } from '../../../../lib/api-auth'
import { LAUNCH_COMMS, LaunchCommsKey } from '../../../../lib/launch-comms'
import { sendMany, EmailPayload } from '../../../../lib/resend-send'

const LAUNCH_FROM     = 'Chris Smith <noreply@send.canadianmidwest.ca>'
const LAUNCH_REPLY_TO = 'chris@canadianmidwest.ca'

// Recipient role union per launch comm.
const RECIPIENT_ROLES: Record<LaunchCommsKey, string[]> = {
  council_prep:     ['admin', 'council'],
  ordinand_prep:    ['admin', 'ordinand'],
  ordinand_go_live: ['admin', 'ordinand'],
}

// Regina-date → launch comm. Regina is CST year-round (UTC-6, no DST).
// 16:00 UTC = 10:00 Regina, same calendar date on both sides.
const SCHEDULE: Record<string, LaunchCommsKey> = {
  '2026-05-14': 'council_prep',
  '2026-05-15': 'ordinand_prep',
  '2026-06-01': 'ordinand_go_live',
}

type Recipient = {
  id:         string
  email:      string
  first_name: string | null
  last_name:  string | null
}

type SendResultRow = {
  email:   string
  ok:      boolean
  detail?: string
}

function reginaDateString(now: Date = new Date()): string {
  // Regina = UTC-6 year-round. Shift the UTC instant by -6h and read the date.
  const shifted = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

async function loadRecipients(roles: string[]): Promise<Recipient[]> {
  const { data, error } = await serviceClient
    .from('profiles')
    .select('id, email, first_name, last_name, roles, is_demo')
    .overlaps('roles', roles)

  if (error) throw new Error(`Failed to load recipients: ${error.message}`)

  return (data ?? [])
    .filter((p: any) =>
      p.email
      && !p.email.endsWith('@cmd-demo.local')
      && p.is_demo !== true
    )
    .map((p: any) => ({
      id:         p.id,
      email:      p.email,
      first_name: p.first_name,
      last_name:  p.last_name,
    }))
}

async function sendLaunchComm(key: LaunchCommsKey, resendKey: string) {
  const recipients = await loadRecipients(RECIPIENT_ROLES[key])
  if (recipients.length === 0) {
    return { key, recipientCount: 0, results: [] as SendResultRow[] }
  }

  const payloads: EmailPayload[] = recipients.map(r => {
    const firstName = r.first_name?.trim() || 'Friend'
    const recipientLine = r.last_name
      ? `${firstName} ${r.last_name} <${r.email}>`
      : `${firstName} <${r.email}>`
    const { subject, html } = LAUNCH_COMMS[key](firstName)
    return {
      from:     LAUNCH_FROM,
      to:       [recipientLine],
      reply_to: LAUNCH_REPLY_TO,
      subject,
      html,
    }
  })

  const sendResults = await sendMany(payloads, resendKey)

  const results: SendResultRow[] = recipients.map((r, i) => {
    const sr = sendResults[i]
    return sr.ok
      ? { email: r.email, ok: true }
      : { email: r.email, ok: false, detail: `${sr.status ?? 'err'}: ${sr.detail}` }
  })

  return { key, recipientCount: recipients.length, results }
}

// Vercel Cron uses GET. Date-dispatched: today's Regina date decides the comm.
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

  const today = reginaDateString()
  const key = SCHEDULE[today]
  if (!key) {
    return new NextResponse(null, { status: 204 })
  }

  const summary = await sendLaunchComm(key, resendKey)
  const allOk = summary.results.every(r => r.ok)
  return NextResponse.json({
    firedBy: 'cron',
    firedAt: new Date().toISOString(),
    reginaDate: today,
    ...summary,
  }, { status: allOk ? 200 : 207 })
}

// Manual recovery path: admin POST with { key } in body to fire any comm
// on demand (e.g. cron missed, or partial-failure resend).
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const key = body?.key as LaunchCommsKey | undefined
  if (!key || !(key in LAUNCH_COMMS)) {
    return NextResponse.json({
      error: 'Provide { key: "council_prep" | "ordinand_prep" | "ordinand_go_live" }',
    }, { status: 400 })
  }

  const summary = await sendLaunchComm(key, resendKey)
  const allOk = summary.results.every(r => r.ok)
  return NextResponse.json({
    firedBy: 'admin',
    firedByEmail: auth.user!.email,
    firedAt: new Date().toISOString(),
    ...summary,
  }, { status: allOk ? 200 : 207 })
}
