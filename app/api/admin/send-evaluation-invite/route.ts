// app/api/admin/send-evaluation-invite/route.ts
// Creates an evaluation token and sends the invitation email via Resend.
// Caller must be an authenticated admin.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL, SITE_DOMAIN, EMAIL_FROM, ORG_NAME, ORG_PARENT } from '../../../../lib/config'
import { fetchWithTimeout } from '../../../../utils/fetchWithTimeout'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function buildEmailHtml(opts: {
  recipientName: string
  ordinandName: string
  ordinandFirst: string
  evalUrl: string
  isMentor: boolean
}): string {
  const { recipientName, ordinandName, ordinandFirst, evalUrl, isMentor } = opts
  const contextLine = isMentor
    ? `You are receiving this message because you have been serving as the ministry mentor for <strong style="color:#1e293b;">${ordinandName}</strong>.`
    : `You are receiving this message as a representative of the Board of Elders for the church where <strong style="color:#1e293b;">${ordinandName}</strong> serves in ministry.`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background:#00426A;border-bottom:4px solid #0077C8;padding:20px 32px;">
            <img src="/cmd-logo.png" height="36" alt="CMD" style="vertical-align:middle;" />
            <span style="color:#ffffff;font-weight:bold;font-size:15px;letter-spacing:0.05em;vertical-align:middle;margin-left:12px;">CMD ORDINATION PORTAL</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#1e293b;font-size:15px;margin:0 0 20px;">Dear ${recipientName},</p>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">${contextLine}</p>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
              As ${ordinandFirst} approaches the final stage of the ordination process with the Canadian Midwest District,
              the Ordaining Council is gathering evaluations from those who know them best in ministry context.
              Your honest and thoughtful response is an important part of this process.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#00426A;border-radius:8px;padding:14px 32px;">
                  <a href="${evalUrl}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.02em;">Complete the Evaluation →</a>
                </td>
              </tr>
            </table>

            <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="color:#0077C8;font-size:12px;word-break:break-all;margin:0 0 24px;">${evalUrl}</p>
            <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
              This link is personal to you and expires after a single submission.
              The form takes approximately 15–20 minutes to complete.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
            <p style="color:#94a3b8;font-size:11px;margin:0 0 4px;">Canadian Midwest District · The Alliance Canada</p>
            <p style="color:#94a3b8;font-size:11px;margin:0;">${SITE_DOMAIN}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await serviceClient
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()
  if (!callerProfile?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { ordinandId, ordinandName, evalType, recipientName, recipientEmail } = body

  if (!ordinandId || !evalType || !recipientName || !recipientEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(recipientEmail)) {
    return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  // Create the token server-side (service role bypasses RLS)
  const { data: tokenData, error: tokenError } = await serviceClient
    .from('evaluation_tokens')
    .insert({
      ordinand_id: ordinandId,
      eval_type: evalType,
      evaluator_name: recipientName,
      evaluator_email: recipientEmail,
      created_by: user.id,
    })
    .select()
    .single()

  if (tokenError || !tokenData) {
    return NextResponse.json({ error: tokenError?.message ?? 'Token creation failed' }, { status: 500 })
  }

  const evalUrl = `${SITE_URL}/eval/${tokenData.token}`
  const ordinandFirst = (ordinandName as string).split(' ')[0]
  const isMentor = evalType === 'mentor'
  const html = buildEmailHtml({ recipientName, ordinandName, ordinandFirst, evalUrl, isMentor })

  const resendRes = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    timeoutMs: 15_000,
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [`${recipientName} <${recipientEmail}>`],
      subject: `Ordination Evaluation Request — ${ordinandName}`,
      html,
    }),
  })

  if (!resendRes.ok) {
    // Roll back the token so the admin can try again cleanly
    await serviceClient.from('evaluation_tokens').delete().eq('id', tokenData.id)
    const resendError = await resendRes.json().catch(() => ({}))
    return NextResponse.json({ error: 'Email send failed: ' + (resendError?.message ?? resendRes.statusText) }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
