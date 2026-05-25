// app/api/admin/send-progress-update/route.ts
// Sends an ordinand-facing "progress update" email from the portal address,
// with Reply-To set to the calling admin so any reply lands in their inbox.
//
// Replaces the previous mailto: workflow on the candidate detail page —
// see lib/progress-email.ts for the shared body builder used by both the
// modal preview and this route.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { EMAIL_FROM } from '../../../../lib/config'
import { wrapEmail } from '../../../../lib/email-templates'
import {
  buildProgressEmailBody,
  buildProgressEmailSubject,
  type ProgressEmailRequirement,
} from '../../../../lib/progress-email'
import { sendOne } from '../../../../lib/resend-send'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  // ── Auth: admin only ──────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ sent: false, reason: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ sent: false, reason: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await serviceClient
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()
  if (!callerProfile?.roles?.includes('admin')) {
    return NextResponse.json({ sent: false, reason: 'Forbidden' }, { status: 403 })
  }

  // ── Body ──────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const { ordinandId, extraComments } = body as {
    ordinandId?: string
    extraComments?: string
  }
  if (!ordinandId) {
    return NextResponse.json({ sent: false, reason: 'Missing ordinandId' }, { status: 400 })
  }

  // ── Pull ordinand + active requirements (server-side source of truth) ─
  const { data: candidate, error: profileErr } = await serviceClient
    .from('profiles')
    .select('id, first_name, last_name, email, cohorts(season, year, assignment_due_date)')
    .eq('id', ordinandId)
    .single()
  if (profileErr || !candidate?.email) {
    return NextResponse.json({ sent: false, reason: 'Ordinand not found or has no email' }, { status: 404 })
  }

  const { data: requirements, error: reqsErr } = await serviceClient
    .from('ordinand_requirements')
    .select('status, custom_title, requirement_templates(title)')
    .eq('ordinand_id', ordinandId)
  if (reqsErr) {
    return NextResponse.json({ sent: false, reason: 'Failed to load requirements', detail: reqsErr.message }, { status: 500 })
  }

  const cohort = Array.isArray(candidate.cohorts) ? candidate.cohorts[0] : candidate.cohorts
  const cohortLabel  = cohort ? `${cohort.season} ${cohort.year}` : 'Unknown cohort'
  const cohortDueDate: string | null = cohort?.assignment_due_date ?? null

  const subject = buildProgressEmailSubject({
    firstName: candidate.first_name,
    lastName:  candidate.last_name,
  })
  const inner = buildProgressEmailBody({
    firstName:     candidate.first_name,
    lastName:      candidate.last_name,
    cohortLabel,
    cohortDueDate,
    requirements:  (requirements ?? []) as unknown as ProgressEmailRequirement[],
    extraComments,
  })
  const html = wrapEmail(inner)

  // ── Send ──────────────────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const recipientName = `${candidate.first_name} ${candidate.last_name}`.trim()

  // No reply_to: the email is signed from the CMD Ordaining Council, so any
  // reply belongs in the council inbox (the portal's noreply From address),
  // not in the sending admin's personal inbox.
  const result = await sendOne({
    from:    EMAIL_FROM,
    to:      [recipientName ? `${recipientName} <${candidate.email}>` : candidate.email],
    subject,
    html,
  }, resendKey)

  if (!result.ok) {
    return NextResponse.json({ sent: false, reason: 'Resend API error', detail: result.detail, status: result.status }, { status: 502 })
  }

  return NextResponse.json({ sent: true, id: result.id })
}
