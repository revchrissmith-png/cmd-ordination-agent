// app/api/admin/archive-report/route.ts
// Save (POST) or fetch (GET) archive reports.
// Also handles email delivery of reports.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'
import { EMAIL_FROM, ORG_NAME } from '../../../../lib/config'
import { wrapEmail } from '../../../../lib/email-templates'
import { fetchWithTimeout } from '../../../../utils/fetchWithTimeout'

/** GET /api/admin/archive-report?ordinandId=<uuid> */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'admin', 'council')
  if (auth.error) return auth.error

  const ordinandId = req.nextUrl.searchParams.get('ordinandId')
  if (!ordinandId || !isValidUUID(ordinandId)) {
    return NextResponse.json({ error: 'Valid ordinandId required' }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('archive_reports')
    .select('*')
    .eq('ordinand_id', ordinandId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }

  return NextResponse.json({ report: data })
}

/** POST /api/admin/archive-report — save or email a report */
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { action } = body // 'save' or 'email'

  if (action === 'email') {
    return handleEmail(body, auth.user)
  }

  // Default: save
  return handleSave(body, auth.user)
}

async function handleSave(body: any, user: any) {
  const {
    ordinandId, interviewId, reportText, aiSummary,
    interviewDate, interviewResult, ordinationDate, officiant,
  } = body

  if (!ordinandId || !isValidUUID(ordinandId)) {
    return NextResponse.json({ error: 'Valid ordinandId required' }, { status: 400 })
  }
  if (!reportText) {
    return NextResponse.json({ error: 'reportText required' }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('archive_reports')
    .insert({
      ordinand_id: ordinandId,
      interview_id: interviewId && isValidUUID(interviewId) ? interviewId : null,
      report_text: reportText,
      ai_summary: aiSummary || '',
      interview_date: interviewDate || null,
      interview_result: interviewResult || null,
      ordination_date: ordinationDate || null,
      officiant: officiant || '',
      generated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }

  return NextResponse.json({ report: data }, { status: 201 })
}

async function handleEmail(body: any, _user: any) {
  const { reportText, candidateName, recipients } = body

  if (!reportText || !candidateName) {
    return NextResponse.json({ sent: false, reason: 'Missing reportText or candidateName' }, { status: 400 })
  }

  const to: string[] = Array.isArray(recipients) && recipients.length > 0
    ? recipients.map((r: any) => r.name ? `${r.name} <${r.email}>` : r.email)
    : []

  if (to.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No recipients specified' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const html = reportToHtml(reportText, candidateName)

  const resendRes = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    timeoutMs: 15_000,
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject: `Archive Report — ${candidateName}`,
      html,
    }),
  })

  if (!resendRes.ok) {
    return NextResponse.json({ sent: false, reason: 'Email delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ sent: true, recipientCount: to.length })
}

// ── HTML conversion ──────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const SECTION_HEADERS = [
  'COMPLETION SUMMARY', 'ORAL INTERVIEW', 'ORDINATION SERVICE',
  'EXTERNAL EVALUATIONS', 'MENTOR REPORT', 'AI EXECUTIVE SUMMARY',
]

function reportToHtml(reportText: string, candidateName: string): string {
  const DEEP_SEA = '#00426A'
  const lines = reportText.split('\n')
  let html = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { html += '<br/>'; continue }

    const isHeader = SECTION_HEADERS.some(h => trimmed.toUpperCase().startsWith(h))
    if (isHeader) {
      html += `<h2 style="color:${DEEP_SEA};font-size:15px;font-weight:bold;margin:24px 0 8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;letter-spacing:0.04em;">${escapeHtml(trimmed)}</h2>`
    } else if (trimmed.startsWith('✓') || trimmed.startsWith('○') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
      html += `<p style="color:#334155;font-size:14px;line-height:1.7;margin:4px 0 4px 16px;padding-left:8px;border-left:3px solid #e2e8f0;">${escapeHtml(trimmed)}</p>`
    } else if (trimmed.startsWith('─')) {
      html += `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>`
    } else {
      html += `<p style="color:#334155;font-size:14px;line-height:1.7;margin:6px 0;">${escapeHtml(trimmed)}</p>`
    }
  }

  const header = `<p style="color:#64748b;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;">Archive Report</p>
<h1 style="color:${DEEP_SEA};font-size:22px;font-weight:900;margin:0 0 4px;">${escapeHtml(candidateName)}</h1>
<p style="color:#94a3b8;font-size:12px;margin:0 0 20px;">Generated ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })} &middot; ${ORG_NAME}</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;"/>`

  const footer = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px;"/>
<p style="color:#94a3b8;font-size:11px;font-style:italic;margin:0;">Confidential — for district records only.</p>`

  return wrapEmail(header + html + footer)
}
