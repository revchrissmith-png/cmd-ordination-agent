// app/api/survey/[token]/route.ts
// POST: submit a survey response, gated by the invitation token.
//
// Body: { answers: Record<string, ...>, anonymous: boolean }
//
// If anonymous=true, the response row is inserted with profile_id=NULL
// and invitation_id=NULL (enforced by CHECK constraint at the DB so the
// "anonymous" promise can't be silently undone by a buggy caller). The
// invitation itself is still marked submitted_at so the link can't be
// reused, which is the only residual signal that this attendee submitted.
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '../../../../lib/api-auth'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  // 1. Look up invitation
  const { data: invitation } = await serviceClient
    .from('cohort_event_survey_invitations')
    .select(`
      id, survey_id, profile_id, submitted_at,
      survey:cohort_event_surveys ( id, questions, closes_at )
    `)
    .eq('token', token)
    .single()
  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }
  if (invitation.submitted_at) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const survey = (invitation as any).survey
  if (survey?.closes_at && new Date(survey.closes_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Survey closed' }, { status: 410 })
  }

  // 2. Validate body
  const body = await req.json().catch(() => ({}))
  const { answers, anonymous } = body ?? {}
  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Missing answers' }, { status: 400 })
  }
  if (typeof anonymous !== 'boolean') {
    return NextResponse.json({ error: 'Missing anonymous flag' }, { status: 400 })
  }

  // 3. Required-field check against the frozen question list on the survey
  const questions: any[] = Array.isArray(survey?.questions) ? survey.questions : []
  for (const q of questions) {
    if (!q.required) continue
    const v = answers[q.id]
    if (q.type === 'scale'  && typeof v !== 'number') return NextResponse.json({ error: `Missing answer for ${q.id}` }, { status: 400 })
    if (q.type === 'single' && (typeof v !== 'string' || !v)) return NextResponse.json({ error: `Missing answer for ${q.id}` }, { status: 400 })
    if (q.type === 'text'   && (typeof v !== 'string' || !v.trim())) return NextResponse.json({ error: `Missing answer for ${q.id}` }, { status: 400 })
    if (q.type === 'multi') {
      const has = (Array.isArray(v?.selected) && v.selected.length > 0)
        || (typeof v?.other === 'string' && v.other.trim().length > 0)
      if (!has) return NextResponse.json({ error: `Missing answer for ${q.id}` }, { status: 400 })
    }
  }

  // 4. Insert response. CHECK constraint enforces anonymous ↔ NULL profile_id/invitation_id.
  const responseRow = anonymous
    ? {
        survey_id:     survey.id,
        invitation_id: null,
        profile_id:    null,
        anonymous:     true,
        answers,
      }
    : {
        survey_id:     survey.id,
        invitation_id: invitation.id,
        profile_id:    invitation.profile_id,
        anonymous:     false,
        answers,
      }

  const { error: insErr } = await serviceClient
    .from('cohort_event_survey_responses')
    .insert(responseRow)
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // 5. Mark invitation submitted to lock the link.
  await serviceClient
    .from('cohort_event_survey_invitations')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ ok: true })
}
