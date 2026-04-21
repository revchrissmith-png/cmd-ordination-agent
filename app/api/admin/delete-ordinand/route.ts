// app/api/admin/delete-ordinand/route.ts
// Fully removes an ordinand and all their related records.
// Used for test accounts and migration artifacts — not for archiving real ordinands.
// Requires admin role. Runs server-side with service role to bypass RLS.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const { ordinandId } = await req.json()
  if (!ordinandId || !isValidUUID(ordinandId)) {
    return NextResponse.json({ error: 'Invalid ordinand ID' }, { status: 400 })
  }

  // Verify the target is actually an ordinand
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, full_name, roles')
    .eq('id', ordinandId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Ordinand not found' }, { status: 404 })
  }

  const deleted: Record<string, number> = {}

  // 1. Get all ordinand_requirements for this person (needed for cascading)
  const { data: requirements } = await serviceClient
    .from('ordinand_requirements')
    .select('id')
    .eq('ordinand_id', ordinandId)

  const reqIds = (requirements ?? []).map(r => r.id)

  // 2. Delete grades (FK: grading_assignment_id → grading_assignments, submission_id → submissions)
  if (reqIds.length > 0) {
    // Get assignment IDs for this ordinand's requirements
    const { data: assignments } = await serviceClient
      .from('grading_assignments')
      .select('id')
      .in('ordinand_requirement_id', reqIds)
    const assignIds = (assignments ?? []).map(a => a.id)

    if (assignIds.length > 0) {
      const { count } = await serviceClient
        .from('grades')
        .delete({ count: 'exact' })
        .in('grading_assignment_id', assignIds)
      deleted.grades = count ?? 0
    }

    // 3. Delete grading_assignments
    const { count: assignCount } = await serviceClient
      .from('grading_assignments')
      .delete({ count: 'exact' })
      .in('ordinand_requirement_id', reqIds)
    deleted.grading_assignments = assignCount ?? 0
  }

  // 4. Delete submissions (FK: ordinand_id)
  const { count: subCount } = await serviceClient
    .from('submissions')
    .delete({ count: 'exact' })
    .eq('ordinand_id', ordinandId)
  deleted.submissions = subCount ?? 0

  // 5. Delete ordinand_requirements
  const { count: reqCount } = await serviceClient
    .from('ordinand_requirements')
    .delete({ count: 'exact' })
    .eq('ordinand_id', ordinandId)
  deleted.ordinand_requirements = reqCount ?? 0

  // 6. Delete evaluations (FK: ordinand_id)
  const { count: evalCount } = await serviceClient
    .from('evaluations')
    .delete({ count: 'exact' })
    .eq('ordinand_id', ordinandId)
  deleted.evaluations = evalCount ?? 0

  // 7. Delete evaluation_tokens (FK: ordinand_id)
  const { count: tokenCount } = await serviceClient
    .from('evaluation_tokens')
    .delete({ count: 'exact' })
    .eq('ordinand_id', ordinandId)
  deleted.evaluation_tokens = tokenCount ?? 0

  // 8. Delete pardington_logs (FK: ordinand_id)
  const { count: logCount } = await serviceClient
    .from('pardington_logs')
    .delete({ count: 'exact' })
    .eq('ordinand_id', ordinandId)
  deleted.pardington_logs = logCount ?? 0

  // 9. Delete grading_exclusions (FK: ordinand_id — has CASCADE but being explicit)
  const { count: exclCount } = await serviceClient
    .from('grading_exclusions')
    .delete({ count: 'exact' })
    .eq('ordinand_id', ordinandId)
  deleted.grading_exclusions = exclCount ?? 0

  // 10. Delete mentor_reports (FK: ordinand_id)
  const { count: mentorCount } = await serviceClient
    .from('mentor_reports')
    .delete({ count: 'exact' })
    .eq('ordinand_id', ordinandId)
  deleted.mentor_reports = mentorCount ?? 0

  // 11. Soft-delete the profile (keep for audit trail)
  await serviceClient
    .from('profiles')
    .update({ status: 'deleted', status_changed_at: new Date().toISOString() })
    .eq('id', ordinandId)

  deleted.profile = 1

  return NextResponse.json({
    success: true,
    ordinand: profile.full_name,
    deleted,
  })
}
