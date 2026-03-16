// app/api/notify-grader/route.ts
// Sends an email notification to the assigned council grader when an ordinand submits an assignment.
// Called by the ordinand submission page after a successful submit.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // 1. Verify the caller is authenticated
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user: caller } } = await serviceClient.auth.getUser(token)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse body
  const { requirementId } = await req.json()
  if (!requirementId) return NextResponse.json({ error: 'requirementId is required' }, { status: 400 })

  // 3. Look up the requirement + template + ordinand profile
  const { data: req_data, error: reqErr } = await serviceClient
    .from('ordinand_requirements')
    .select(`
      id,
      ordinand_id,
      requirement_templates ( title, type ),
      profiles!ordinand_requirements_ordinand_id_fkey ( first_name, last_name, email )
    `)
    .eq('id', requirementId)
    .single()

  if (reqErr || !req_data) {
    return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
  }

  // Verify the caller owns this requirement
  if (req_data.ordinand_id !== caller.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Look up the grading assignment for this requirement
  const { data: assignment } = await serviceClient
    .from('grading_assignments')
    .select(`
      id,
      council_member_id,
      profiles!grading_assignments_council_member_id_fkey ( first_name, last_name, email )
    `)
    .eq('ordinand_requirement_id', requirementId)
    .maybeSingle()

  if (!assignment) {
    // No grader assigned — nothing to notify, return success silently
    return NextResponse.json({ sent: false, reason: 'No grader assigned' })
  }

  const graderProfile = assignment.profiles as any
  const ordinandProfile = req_data.profiles as any
  const template = req_data.requirement_templates as any

  if (!graderProfile?.email) {
    return NextResponse.json({ sent: false, reason: 'Grader has no email' })
  }

  const ordinandName = [ordinandProfile?.first_name, ordinandProfile?.last_name].filter(Boolean).join(' ') || 'An ordinand'
  const graderName   = graderProfile.first_name || 'Council Member'
  const assignmentTitle = template?.title || 'an assignment'
  const gradingUrl   = `https://ordination.canadianmidwest.ca/dashboard/council/grade/${assignment.id}`

  // 5. Send via Resend REST API
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured')
    return NextResponse.json({ sent: false, reason: 'Email service not configured' })
  }

  const emailBody = {
    from: 'CMD Ordination Portal <portal@canadianmidwest.ca>',
    to: [graderProfile.email],
    subject: `New submission ready to grade — ${ordinandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #00426A; padding: 24px 32px; border-bottom: 4px solid #0077C8;">
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style="height: 40px;" />
          <span style="color: #ffffff; font-weight: bold; font-size: 14px; margin-left: 12px; vertical-align: middle; letter-spacing: 0.05em;">CMD ORDINATION PORTAL</span>
        </div>

        <div style="padding: 32px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hello ${graderName},</p>

          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 16px 0;">
            <strong style="color: #00426A;">${ordinandName}</strong> has submitted an assignment that is assigned to you for grading:
          </p>

          <div style="background: #f0f7ff; border-left: 4px solid #0077C8; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
            <p style="color: #00426A; font-weight: bold; font-size: 15px; margin: 0;">${assignmentTitle}</p>
          </div>

          <a href="${gradingUrl}" style="display: inline-block; background: #0077C8; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 6px; letter-spacing: 0.04em; margin: 8px 0 24px;">
            OPEN GRADING PAGE →
          </a>

          <p style="color: #888; font-size: 13px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 20px; margin-top: 8px;">
            You're receiving this because you are the assigned grader for this submission.<br/>
            If you have questions, please contact the CMD District Office.
          </p>
        </div>
      </div>
    `,
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailBody),
  })

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    console.error('Resend error:', errText)
    return NextResponse.json({ sent: false, reason: 'Email delivery failed' })
  }

  return NextResponse.json({ sent: true })
}
