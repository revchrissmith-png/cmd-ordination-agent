// app/api/admin/interviews/[id]/route.ts
// Get, update, or delete a single oral interview record.
// Admin-only.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../../lib/api-auth'

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/admin/interviews/:id */
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireRole(req, 'admin', 'council')
  if (auth.error) return auth.error

  const { id } = await ctx.params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid interview ID' }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('oral_interviews')
    .select(`
      *,
      ordinand:profiles!oral_interviews_ordinand_id_fkey(id, first_name, last_name, email, mentor_name, cohort_id,
        cohorts(year, season, sermon_topic)
      ),
      conducted_by_profile:profiles!oral_interviews_conducted_by_fkey(id, first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  return NextResponse.json({ interview: data })
}

/** PATCH /api/admin/interviews/:id — update interview fields */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const { id } = await ctx.params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid interview ID' }, { status: 400 })
  }

  const body = await req.json()

  // Whitelist allowed fields
  const allowed: Record<string, unknown> = {}
  const fields = [
    'scheduled_date', 'interview_date', 'status', 'result',
    'council_present', 'notes', 'decision_notes', 'brief_snapshot',
    'conducted_by', 'ordination_date', 'officiant',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Validate status if provided
  const validStatuses = ['scheduled', 'in_progress', 'decided', 'cancelled']
  if (allowed.status && !validStatuses.includes(allowed.status as string)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Validate result if provided
  const validResults = ['sustained', 'conditional', 'deferred', 'not_sustained']
  if (allowed.result && !validResults.includes(allowed.result as string)) {
    return NextResponse.json({ error: 'Invalid result' }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('oral_interviews')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 })
  }

  return NextResponse.json({ interview: data })
}

/** DELETE /api/admin/interviews/:id */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const { id } = await ctx.params
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid interview ID' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('oral_interviews')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete interview' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
