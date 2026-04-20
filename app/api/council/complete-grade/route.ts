// app/api/council/complete-grade/route.ts
// Updates ordinand_requirements.status after a council member finalizes a grade.
// Runs server-side with the service role client so it bypasses RLS.
// Verifies the caller owns the grading assignment for this requirement.
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated council (or admin) member
  const auth = await requireRole(req, 'council')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { requirementId, status } = body

  if (!requirementId || !isValidUUID(requirementId)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!['complete', 'revision_required'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  // Verify the caller owns this grading assignment (admins bypass)
  if (!auth.roles.includes('admin')) {
    const { data: assignment } = await serviceClient
      .from('grading_assignments')
      .select('id')
      .eq('ordinand_requirement_id', requirementId)
      .eq('council_member_id', auth.user.id)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: 'You are not assigned to grade this requirement' }, { status: 403 })
    }
  }

  const { error: updateError } = await serviceClient
    .from('ordinand_requirements')
    .update({ status })
    .eq('id', requirementId)

  if (updateError) {
    console.error('complete-grade update error:', updateError)
    return NextResponse.json({ error: 'Failed to update requirement status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
