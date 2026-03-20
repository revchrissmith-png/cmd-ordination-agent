// app/api/notify-grader/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const diag: Record<string, any> = {}

  const body = await req.json().catch(() => ({}))
  const { requirementId } = body
  diag.requirementId = requirementId ?? null

  if (!requirementId) {
    return NextResponse.json({ sent: false, reason: 'Missing requirementId', diag })
  }

  // 1. Requirement
  const { data: reqRow, error: reqErr } = await serviceClient
    .from('ordinand_requirements')
    .select('id, ordinand_id, template_id')
    .eq('id', requirementId)
    .single()
  diag.requirement = reqRow ? 'found' : `not found (${reqErr?.message})`
  if (!reqRow) return NextResponse.json({ sent: false, reason: 'Requirement not found', diag })

  // 2. Template title
  const { data: template } = await serviceClient
    .from('requirement_templates').select('title').eq('id', reqRow.template_id).single()
  diag.template = template?.title ?? 'not found'

  // 3. Ordinand name
  const { data: ordinandProfile } = await serviceClient
    .from('profiles').select('first_name, last_name').eq('id', reqRow.ordinand_id).single()
  diag.ordinand = ordinandProfile ? `${ordinandProfile.first_name} ${ordinandProfile.last_name}` : 'not found'

  // 4. Grading assignment
  const { data: assignment, error: assignErr } = await serviceClient
    .from('grading_assignments').select('id, council_member_id')
    .eq('ordinand_requirement_id', requirementId).maybeSingle()
  diag.assignment = assignment ? `found (id: ${assignment.id})` : `none (${assignErr?.message ?? 'no row'})`
  if (!assignment) {
    console.log('[notify-grader] no assignment', JSON.stringify(diag))
    return NextResponse.json({ sent: false, reason: 'No grader assigned', diag })
  }

  // 5. Grader email
  const { data: graderProfile, error: graderErr } = await serviceClient
    .from('profiles').select('first_name, email').eq('id', assignment.council_member_id).single()
  diag.grader = graderProfile?.email ? `${graderProfile.first_name} <${graderProfile.email}>` : `no email (${graderErr?.message})`
  if (!graderProfile?.email) {
    console.log('[notify-grader] no grader email', JSON.stringify(diag))
    return NextResponse.json({ sent: false, reason: 'Grader email not found', diag })
  }

  // 6. Resend key
  const resendKey = process.env.RESEND_API_KEY
  diag.resendKeyPresent = !!resendKey
  if (!resendKey) {
    console.log('[notify-grader] no RESEND_API_KEY', JSON.stringify(diag))
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not set in Vercel env vars', diag })
  }

  // 7. Send
  const ordinandName    = [ordinandProfile?.first_name, ordinandProfile?.last_name].filter(Boolean).join(' ') || 'An ordinand'
  const graderName      = graderProfile.first_name || 'Council Member'
  const assignmentTitle = template?.title || 'an assignment'
  const gradingUrl      = `https://ordination.canadianmidwest.ca/dashboard/council/grade/${assignment.id}`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'CMD Ordination Portal <onboarding@resend.dev>',
      to: [graderProfile.email],
      subject: `New submission ready to grade — ${ordinandName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #00426A; padding: 24px 32px; border-bottom: 4px solid #0077C8;">
            <span style="color: #fff; font-weight: bold; font-size: 16px; letter-spacing: 0.05em;">CMD ORDINATION PORTAL</span>
          </div>
          <div style="padding: 32px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hello ${graderName},</p>
            <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 16px 0;">
              <strong style="color: #00426A;">${ordinandName}</strong> has submitted an assignment assigned to you for grading:
            </p>
            <div style="background: #f0f7ff; border-left: 4px solid #0077C8; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
              <p style="color: #00426A; font-weight: bold; font-size: 15px; margin: 0;">${assignmentTitle}</p>
            </div>
            <a href="${gradingUrl}" style="display: inline-block; background: #0077C8; color: #fff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 6px; margin: 8px 0 24px;">
              OPEN GRADING PAGE →
            </a>
            <p style="color: #888; font-size: 13px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 20px; margin-top: 8px;">
              You're receiving this because you are the assigned grader for this submission.<br/>
              If you have questions, please contact the CMD District Office.
            </p>
          </div>
        </div>`,
    }),
  })

  const resendBody = await resendRes.text()
  diag.resendStatus = resendRes.status
  diag.resendResponse = resendBody

  if (!resendRes.ok) {
    console.log('[notify-grader] FAILED', JSON.stringify(diag))
    return NextResponse.json({ sent: false, reason: 'Resend API error', diag })
  }

  console.log('[notify-grader] SENT', JSON.stringify({ to: graderProfile.email, subject: `New submission ready to grade — ${ordinandName}` }))
  return NextResponse.json({ sent: true, diag })
}
