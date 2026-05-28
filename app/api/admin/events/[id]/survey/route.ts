// app/api/admin/events/[id]/survey/route.ts
// POST: create a survey for an event from a versioned seed.
//
// Body: { title, intro, send_at, seed_slug, dispatch_now }
//
// Behaviour:
//   - Verifies admin role.
//   - Refuses if attendance has zero attended=true rows for the event
//     (belt-and-suspenders against accidentally sending to nobody / everyone).
//   - Resolves seed_slug → SurveyTemplate map kept here so the question list
//     can't be tampered with via the request body. Server inserts the frozen
//     question list into cohort_event_surveys.questions.
//   - If dispatch_now=true, calls the internal dispatch action immediately.
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../../../lib/api-auth'
import { INTERCULTURAL_FLUENCY_2026_05_27 } from '../../../../../../lib/surveys/intercultural-fluency-2026-05-27'
import type { SurveyTemplate } from '../../../../../../lib/surveys/types'
import { dispatchSurvey } from '../../../../../../lib/survey-dispatch'

const TEMPLATES: Record<string, SurveyTemplate> = {
  [INTERCULTURAL_FLUENCY_2026_05_27.slug]: INTERCULTURAL_FLUENCY_2026_05_27,
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await context.params
  if (!isValidUUID(eventId)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { title, intro, send_at, seed_slug, dispatch_now } = body ?? {}

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }
  if (typeof seed_slug !== 'string' || !TEMPLATES[seed_slug]) {
    return NextResponse.json({ error: 'Unknown seed_slug' }, { status: 400 })
  }
  if (typeof send_at !== 'string' || Number.isNaN(Date.parse(send_at))) {
    return NextResponse.json({ error: 'Invalid send_at' }, { status: 400 })
  }

  // Confirm event exists
  const { data: ev } = await serviceClient
    .from('cohort_events')
    .select('id, title')
    .eq('id', eventId)
    .single()
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Refuse if there are no attendees marked
  const { count: attendedCount } = await serviceClient
    .from('cohort_event_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('attended', true)
  if (!attendedCount || attendedCount === 0) {
    return NextResponse.json(
      { error: 'No attendees marked. Mark attendance before creating the survey.' },
      { status: 409 },
    )
  }

  const template = TEMPLATES[seed_slug]
  const questions = template.sections.flatMap(s => s.questions)

  const { data: surveyRow, error: insertErr } = await serviceClient
    .from('cohort_event_surveys')
    .insert({
      event_id:   eventId,
      title:      title.trim(),
      intro:      typeof intro === 'string' ? intro.trim() : null,
      questions,
      send_at,
      created_by: auth.user.id,
    })
    .select('id, send_at')
    .single()

  if (insertErr || !surveyRow) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Dispatch immediately if asked
  if (dispatch_now) {
    const result = await dispatchSurvey(surveyRow.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ survey_id: surveyRow.id, invited: result.invited, sent_now: true })
  }

  return NextResponse.json({
    survey_id: surveyRow.id,
    invited:   attendedCount,
    send_at:   surveyRow.send_at,
  })
}
