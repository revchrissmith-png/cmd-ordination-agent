// app/api/notify-ordinand-graded/route.ts
// Sends an email to the ordinand when their assignment has been graded.
// Requires authentication — caller must be council or admin.
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../lib/api-auth'
import { wrapEmail, emailButton, emailInfoBlock } from '../../../lib/email-templates'
import { SITE_URL, EMAIL_FROM } from '../../../lib/config'

export async function POST(req: NextRequest) {
  // Auth: only council members or admins can trigger grading notifications
  const auth = await requireRole(req, 'council')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { requirementId, graderId, outcome } = body

  if (!requirementId || !isValidUUID(requirementId)) {
    return NextResponse.json({ sent: false, reason: 'Missing or invalid requirementId' })
  }

  if (outcome && !['complete', 'revision_required'].includes(outcome)) {
    return NextResponse.json({ sent: false, reason: 'Invalid outcome value' })
  }

  // 1. Requirement row
  const { data: reqRow } = await serviceClient
    .from('ordinand_requirements')
    .select('id, ordinand_id, template_id')
    .eq('id', requirementId)
    .single()
  if (!reqRow) return NextResponse.json({ sent: false, reason: 'Requirement not found' })

  // 2. Assignment title
  const { data: template } = await serviceClient
    .from('requirement_templates')
    .select('title')
    .eq('id', reqRow.template_id)
    .single()

  // 3. Ordinand profile (needs email to send to)
  const { data: ordinandProfile } = await serviceClient
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', reqRow.ordinand_id)
    .single()
  if (!ordinandProfile?.email) {
    return NextResponse.json({ sent: false, reason: 'Ordinand email not found' })
  }

  // 4. Grader name (council member who graded)
  let graderName = 'Your grader'
  if (graderId) {
    const { data: graderProfile } = await serviceClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', graderId)
      .single()
    if (graderProfile) {
      graderName = [graderProfile.first_name, graderProfile.last_name].filter(Boolean).join(' ') || 'Your grader'
    }
  }

  // 5. Resend key
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' })

  const ordinandName    = [ordinandProfile.first_name, ordinandProfile.last_name].filter(Boolean).join(' ') || 'Ordinand'
  const assignmentTitle = template?.title || 'an assignment'
  const isComplete      = outcome === 'complete'
  const dashboardUrl    = `${SITE_URL}/dashboard/ordinand`

  const outcomeBlock = isComplete
    ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;padding:16px 20px;margin:20px 0;">
         <p style="color:#15803d;font-weight:bold;font-size:15px;margin:0 0 4px;">✓ Marked Complete</p>
         <p style="color:#166534;font-size:14px;margin:0;">This assignment has been marked complete. Well done!</p>
       </div>`
    : `<div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:16px 20px;margin:20px 0;">
         <p style="color:#b91c1c;font-weight:bold;font-size:15px;margin:0 0 4px;">⚠ Revision Required</p>
         <p style="color:#991b1b;font-size:14px;margin:0;">Your grader has requested revisions. Please log in to view their feedback and resubmit when you are ready.</p>
       </div>`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [ordinandProfile.email],
      subject: `${isComplete ? '✓ Assignment graded' : '⚠ Revision requested'} — ${assignmentTitle}`,
      html: wrapEmail(`
            <p style="color:#333;font-size:16px;margin:0 0 8px;">Hello ${ordinandName},</p>
            <p style="color:#555;font-size:15px;line-height:1.6;margin:16px 0;">
              Your submission has been reviewed by <strong style="color:#00426A;">${graderName}</strong>:
            </p>
            ${emailInfoBlock(assignmentTitle)}
            ${outcomeBlock}
            ${emailButton(dashboardUrl, 'VIEW MY DASHBOARD →')}
            <p style="color:#888;font-size:13px;line-height:1.6;border-top:1px solid #eee;padding-top:20px;margin-top:8px;">
              You're receiving this because an assignment in your CMD ordination process has been graded.<br/>
              If you have questions, please contact the CMD District Office.
            </p>`),
    }),
  })

  if (!resendRes.ok) {
    const detail = await resendRes.text()
    return NextResponse.json({ sent: false, reason: 'Resend API error', detail })
  }

  return NextResponse.json({ sent: true })
}
