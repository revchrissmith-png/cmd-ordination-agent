// app/api/admin/preview-launch-comms/route.ts
// Sends preview copies of the three launch-comms emails to every admin
// profile. Subject lines are prefixed with [PREVIEW] so they're not
// mistaken for the real launch send.
//
// Send-from displays as "Chris Smith" (underlying address is the verified
// noreply@send.canadianmidwest.ca — chris@ is not yet a verified sender
// on the Resend domain). Reply-to is chris@canadianmidwest.ca so any
// feedback routes to Chris directly.
//
// Outbound rate is throttled via lib/resend-send to stay under Resend's
// 5/sec cap (the original tight-loop version failed the 6th send when
// Chris first tested with two admin recipients).
//
// Caller must be an authenticated admin.
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient } from '../../../../lib/api-auth'
import { LAUNCH_COMMS, LaunchCommsKey } from '../../../../lib/launch-comms'
import { sendMany, EmailPayload } from '../../../../lib/resend-send'

const LAUNCH_FROM     = 'Chris Smith <noreply@send.canadianmidwest.ca>'
const LAUNCH_REPLY_TO = 'chris@canadianmidwest.ca'

type AdminRecipient = {
  id:         string
  email:      string
  first_name: string | null
  last_name:  string | null
}

type SendResultRow = {
  email:   string
  comm:    LaunchCommsKey
  ok:      boolean
  detail?: string
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  // Fetch all admin recipients. `roles` is a text[] column on profiles.
  const { data: admins, error: adminErr } = await serviceClient
    .from('profiles')
    .select('id, email, first_name, last_name, roles')
    .contains('roles', ['admin'])

  if (adminErr) {
    return NextResponse.json({ error: 'Failed to load admin recipients', detail: adminErr.message }, { status: 500 })
  }

  const recipients: AdminRecipient[] = (admins ?? [])
    .filter((a: any) => a.email && !a.email.endsWith('@cmd-demo.local'))
    .map((a: any) => ({ id: a.id, email: a.email, first_name: a.first_name, last_name: a.last_name }))

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No admin recipients found' }, { status: 404 })
  }

  // Build the full send queue: every admin × every launch comm, with
  // per-admin personalisation. Parallel arrays so we can map back to
  // (email, comm) when results return.
  type QueueEntry = { email: string; comm: LaunchCommsKey; payload: EmailPayload }
  const queue: QueueEntry[] = []

  for (const r of recipients) {
    const firstName = r.first_name?.trim() || 'Friend'
    const recipientLine = r.last_name
      ? `${firstName} ${r.last_name} <${r.email}>`
      : `${firstName} <${r.email}>`

    for (const key of Object.keys(LAUNCH_COMMS) as LaunchCommsKey[]) {
      const { subject, html } = LAUNCH_COMMS[key](firstName)
      queue.push({
        email: r.email,
        comm:  key,
        payload: {
          from:     LAUNCH_FROM,
          to:       [recipientLine],
          reply_to: LAUNCH_REPLY_TO,
          subject:  `[PREVIEW] ${subject}`,
          html,
        },
      })
    }
  }

  const sendResults = await sendMany(queue.map(q => q.payload), resendKey)

  const results: SendResultRow[] = queue.map((q, i) => {
    const r = sendResults[i]
    return r.ok
      ? { email: q.email, comm: q.comm, ok: true }
      : { email: q.email, comm: q.comm, ok: false, detail: `${r.status ?? 'err'}: ${r.detail}` }
  })

  const allOk = results.every(r => r.ok)
  return NextResponse.json({
    sent:    allOk,
    sentBy:  auth.user!.email,
    sentAt:  new Date().toISOString(),
    results,
  }, { status: allOk ? 200 : 207 })
}
