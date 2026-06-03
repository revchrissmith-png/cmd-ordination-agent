// app/api/progress-checkin/[token]/route.ts
// Service-role API behind the anonymous mentor progress-check-in form.
// Keeps mentor_progress_checkins strictly admin-only at the RLS layer: the
// public form never touches the table directly — it goes through here, and
// the unguessable token is the authorization.
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '../../../../lib/api-auth'

// GET — load the non-sensitive prompt context for rendering the form.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data: row } = await serviceClient
    .from('mentor_progress_checkins')
    .select('round, status, profiles!ordinand_id(first_name, full_name)')
    .eq('token', params.token)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const prof: any = Array.isArray((row as any).profiles) ? (row as any).profiles[0] : (row as any).profiles
  return NextResponse.json({
    round: row.round,
    status: row.status,
    alreadySubmitted: row.status === 'submitted',
    ordinandFirstName: prof?.first_name ?? null,
    ordinandName: prof?.full_name ?? null,
  })
}

// POST — record the mentor's narrative responses and mark submitted.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => ({} as any))
  const { q_meeting_diligence, q_pace, q_struggles, requested_meeting, additional_comments } = body

  const { data: row } = await serviceClient
    .from('mentor_progress_checkins').select('id, status').eq('token', params.token).maybeSingle()
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (row.status === 'submitted') return NextResponse.json({ error: 'already_submitted' }, { status: 409 })

  const hasContent = [q_meeting_diligence, q_pace, q_struggles].some(v => String(v ?? '').trim().length > 0)
  if (!hasContent) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const now = new Date().toISOString()
  const { error } = await serviceClient.from('mentor_progress_checkins').update({
    q_meeting_diligence: q_meeting_diligence ?? null,
    q_pace:              q_pace ?? null,
    q_struggles:         q_struggles ?? null,
    requested_meeting:   typeof requested_meeting === 'boolean' ? requested_meeting : null,
    additional_comments: additional_comments ?? null,
    status:              'submitted',
    submitted_at:        now,
    updated_at:          now,
  }).eq('id', row.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
