// app/api/cron/send-launch-comm/route.ts
// Sends one of the three launch-comms emails to its recipient role union.
// Manual-only: an admin POSTs { key } from the Launch Comms admin page. There
// is no cron schedule — launch comms are sent by hand from the dashboard — so
// the former date-dispatched GET handler was removed once launch was complete.
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

// Admin POST with { key } in body to fire any comm on demand from the
// Launch Comms admin page.
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
