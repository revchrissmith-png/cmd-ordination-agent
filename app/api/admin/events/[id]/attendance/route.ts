// app/api/admin/events/[id]/attendance/route.ts
// POST: replace attendance rows for an event (admin only).
// Body: { rows: [{ profile_id, attended }] }
// Returns { saved: <count>, attended: <count where attended=true> }.
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../../../lib/api-auth'

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
  const rows = Array.isArray(body?.rows) ? body.rows : null
  if (!rows) {
    return NextResponse.json({ error: 'Missing rows' }, { status: 400 })
  }

  // Validate row shape before touching the DB
  for (const r of rows) {
    if (!r || typeof r !== 'object') {
      return NextResponse.json({ error: 'Bad row' }, { status: 400 })
    }
    if (typeof r.profile_id !== 'string' || !isValidUUID(r.profile_id)) {
      return NextResponse.json({ error: 'Bad profile_id' }, { status: 400 })
    }
    if (typeof r.attended !== 'boolean') {
      return NextResponse.json({ error: 'Bad attended' }, { status: 400 })
    }
  }

  // Confirm event exists
  const { data: ev } = await serviceClient
    .from('cohort_events')
    .select('id')
    .eq('id', eventId)
    .single()
  if (!ev) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Upsert each row. Composite PK is (event_id, profile_id), so onConflict
  // targets that pair. marked_by + marked_at are refreshed on every save so
  // the audit trail reflects the most recent admin action.
  const upsertRows = rows.map((r: any) => ({
    event_id:   eventId,
    profile_id: r.profile_id,
    attended:   r.attended,
    marked_by:  auth.user.id,
    marked_at:  new Date().toISOString(),
  }))

  const { error: upsertErr } = await serviceClient
    .from('cohort_event_attendance')
    .upsert(upsertRows, { onConflict: 'event_id,profile_id' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  const attended = rows.filter((r: any) => r.attended).length
  return NextResponse.json({ saved: rows.length, attended })
}
