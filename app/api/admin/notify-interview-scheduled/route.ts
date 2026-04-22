// app/api/admin/notify-interview-scheduled/route.ts
// Sends an interview invitation email to all council members when an interview is scheduled.
// Admin-only. Called from InterviewSection after scheduling.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'
import { wrapEmail, emailButton, emailInfoBlock } from '../../../../lib/email-templates'
import { SITE_URL, EMAIL_FROM } from '../../../../lib/config'
import { fetchWithTimeout } from '../../../../utils/fetchWithTimeout'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { interviewId } = body

  if (!interviewId || !isValidUUID(interviewId)) {
    return NextResponse.json({ sent: false, reason: 'Valid interviewId is required' }, { status: 400 })
  }

  // Fetch interview + ordinand details
  const { data: interview } = await serviceClient
    .from('oral_interviews')
    .select('id, ordinand_id, scheduled_date, conducted_by')
    .eq('id', interviewId)
    .single()

  if (!interview) {
    return NextResponse.json({ sent: false, reason: 'Interview not found' }, { status: 404 })
  }

  const { data: ordinand } = await serviceClient
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', interview.ordinand_id)
    .single()

  const candidateName = ordinand
    ? `${ordinand.first_name} ${ordinand.last_name}`.trim()
    : 'an ordinand'

  // Lead interviewer name (if set)
  let leadName = ''
  if (interview.conducted_by) {
    const { data: lead } = await serviceClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', interview.conducted_by)
      .single()
    if (lead) leadName = `${lead.first_name} ${lead.last_name}`.trim()
  }

  // Format interview date
  const dateStr = interview.scheduled_date
    ? new Date(interview.scheduled_date + 'T12:00:00').toLocaleDateString('en-CA', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBD'

  // All council members with emails
  const { data: councilMembers } = await serviceClient
    .from('profiles')
    .select('id, first_name, email')
    .contains('roles', ['council'])

  const recipients = (councilMembers ?? []).filter(m => m.email)
  if (recipients.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No council members with email addresses' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const interviewUrl = `${SITE_URL}/dashboard/council`

  const html = wrapEmail(`
    <p style="color:#333;font-size:16px;margin:0 0 8px;">Ordaining Council Members,</p>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:16px 0;">
      An oral interview has been scheduled for:
    </p>
    ${emailInfoBlock(candidateName)}
    <div style="margin:20px 0;">
      <table style="border-collapse:collapse;font-size:14px;color:#555;">
        <tr>
          <td style="padding:6px 16px 6px 0;font-weight:bold;color:#00426A;">Date</td>
          <td style="padding:6px 0;">${dateStr}</td>
        </tr>
        ${leadName ? `<tr>
          <td style="padding:6px 16px 6px 0;font-weight:bold;color:#00426A;">Lead Interviewer</td>
          <td style="padding:6px 0;">${leadName}</td>
        </tr>` : ''}
      </table>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:16px 0;">
      Please plan to attend. You can view interview details on your council dashboard.
    </p>
    ${emailButton(interviewUrl, 'VIEW COUNCIL DASHBOARD →')}
    <p style="color:#888;font-size:13px;line-height:1.6;border-top:1px solid #eee;padding-top:20px;margin-top:8px;">
      You're receiving this because you are a member of the Ordaining Council.<br/>
      If you have questions, please contact the CMD District Office.
    </p>`)

  const resendRes = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    timeoutMs: 15_000,
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: recipients.map(r => r.email),
      subject: `Oral Interview Scheduled — ${candidateName} — ${dateStr}`,
      html,
    }),
  })

  if (!resendRes.ok) {
    const detail = await resendRes.text()
    return NextResponse.json({ sent: false, reason: 'Email delivery failed', detail }, { status: 502 })
  }

  return NextResponse.json({ sent: true, recipientCount: recipients.length })
}
