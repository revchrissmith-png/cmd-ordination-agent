// app/api/admin/send-council-report/route.ts
// Sends a pre-generated HTML report email to a council member via Resend.
// Caller must be an authenticated admin.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { EMAIL_FROM } from '../../../../lib/config'
import { fetchWithTimeout } from '../../../../utils/fetchWithTimeout'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ sent: false, reason: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ sent: false, reason: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await serviceClient
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()
  if (!callerProfile?.roles?.includes('admin')) {
    return NextResponse.json({ sent: false, reason: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { to, toName, subject, html } = body

  if (!to || !html) {
    return NextResponse.json({ sent: false, reason: 'Missing required fields: to, html' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' })

  const resendRes = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    timeoutMs: 15_000,
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: toName ? [`${toName} <${to}>`] : [to],
      subject: subject || 'CMD Ordination Portal — Grading Assignment Update',
      html,
    }),
  })

  if (!resendRes.ok) {
    const detail = await resendRes.text()
    return NextResponse.json({ sent: false, reason: 'Resend API error', detail })
  }

  return NextResponse.json({ sent: true })
}
