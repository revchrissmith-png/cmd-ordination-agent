// app/api/mentor-report/send/route.ts
// Sends an ordinand's monthly mentor report to their mentor, via the portal's
// Resend integration, and records the send so the Council/admin can confirm it
// went out. Replaces the old mailto: handoff, which depended on the ordinand's
// local mail client and left no trace (a mentor like Lydia could receive
// nothing while the report still showed "submitted").
//
// Privacy: the report CONTENT is persisted only in mentor_reports (ordinand +
// admin RLS, never Council). This route additionally writes mentor_report_sends
// with metadata ONLY — no answer text — which is the Council-visible surface.
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, serviceClient } from '../../../../lib/api-auth'
import { EMAIL_FROM } from '../../../../lib/config'
import { sendOne } from '../../../../lib/resend-send'
import {
  buildMentorReportHtml,
  buildMentorReportSubject,
  hasAnyAnswer,
} from '../../../../lib/mentor-report-email'

export async function POST(req: NextRequest) {
  // The caller must be a signed-in ordinand sending their OWN report.
  const auth = await authenticateUser(req)
  if (auth.error) return auth.error
  const user = auth.user

  const body = await req.json().catch(() => ({}))
  const { month, answers } = body as { month?: string; answers?: Record<string, string> }

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ sent: false, reason: 'Invalid month' }, { status: 400 })
  }
  if (!answers || typeof answers !== 'object' || !hasAnyAnswer(answers)) {
    return NextResponse.json({ sent: false, reason: 'Report is empty' }, { status: 400 })
  }

  // Ordinand's own profile is the source of truth for the mentor target.
  const { data: profile, error: profErr } = await serviceClient
    .from('profiles')
    .select('full_name, email, mentor_name, mentor_email')
    .eq('id', user.id)
    .single()
  if (profErr || !profile) {
    return NextResponse.json({ sent: false, reason: 'Profile not found' }, { status: 404 })
  }
  if (!profile.mentor_email) {
    return NextResponse.json({ sent: false, reason: 'No mentor email on file' }, { status: 422 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const ordinandName = (profile.full_name || '').trim() || 'Your Ordinand'
  const subject = buildMentorReportSubject(ordinandName, month)
  const html = buildMentorReportHtml({
    ordinandName,
    mentorName: profile.mentor_name || 'Mentor',
    month,
    answers,
  })

  const mentorTo = profile.mentor_name
    ? `${profile.mentor_name} <${profile.mentor_email}>`
    : profile.mentor_email

  // Reply-To is the ordinand: the mentoring relationship is direct, so a reply
  // should land with the ordinand, not the portal's noreply inbox.
  const result = await sendOne(
    {
      from: EMAIL_FROM,
      to: [mentorTo],
      subject,
      html,
      reply_to: profile.email || undefined,
    },
    resendKey,
  )

  if (!result.ok) {
    return NextResponse.json(
      { sent: false, reason: 'Email send failed', detail: result.detail },
      { status: 502 },
    )
  }

  // Only on a confirmed send: persist the report (content, ordinand-only) and
  // the send metadata (Council-visible). Both keyed (ordinand_id, month).
  const nowIso = new Date().toISOString()

  const { error: reportErr } = await serviceClient
    .from('mentor_reports')
    .upsert(
      { ordinand_id: user.id, month, answers, is_draft: false, submitted_at: nowIso },
      { onConflict: 'ordinand_id,month' },
    )

  const { error: sendErr } = await serviceClient
    .from('mentor_report_sends')
    .upsert(
      {
        ordinand_id: user.id,
        month,
        mentor_name: profile.mentor_name,
        mentor_email: profile.mentor_email,
        resend_id: result.id ?? null,
        status: 'sent',
        sent_at: nowIso,
      },
      { onConflict: 'ordinand_id,month' },
    )

  // The email is already out the door; a tracking-write hiccup shouldn't read
  // as a failed send to the ordinand. Surface it for logs but return success.
  if (reportErr || sendErr) {
    console.error('mentor-report send: post-send write failed', { reportErr, sendErr })
  }

  return NextResponse.json({ sent: true, id: result.id, mentorEmail: profile.mentor_email })
}
