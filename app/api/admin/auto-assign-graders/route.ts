// app/api/admin/auto-assign-graders/route.ts
// Auto-assigns council graders to unassigned ordinand requirements.
// Respects grading_types restrictions, grading_exclusions, and balances
// workload using pending assignments + 12-month history.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Auth check — Bearer token pattern (matches all other admin API routes)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!profile?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { ordinand_id, requirement_ids } = body as { ordinand_id: string; requirement_ids?: string[] }

  if (!ordinand_id) {
    return NextResponse.json({ error: 'ordinand_id required' }, { status: 400 })
  }

  // Fetch unassigned requirements for this ordinand
  let reqQuery = admin
    .from('ordinand_requirements')
    .select('id, requirement_templates(type)')
    .eq('ordinand_id', ordinand_id)
    .is('grading_assignments', null)

  // Check which requirements already have assignments
  const { data: allReqs } = await admin
    .from('ordinand_requirements')
    .select('id, requirement_templates(type), grading_assignments(id)')
    .eq('ordinand_id', ordinand_id)

  const unassigned = (allReqs || []).filter(r => {
    if (requirement_ids && !requirement_ids.includes(r.id)) return false
    return !r.grading_assignments || (r.grading_assignments as any[]).length === 0
  })

  if (unassigned.length === 0) {
    return NextResponse.json({ assigned: 0, skipped: 0, errors: [] })
  }

  // Fetch council members with grading_types
  const { data: councilMembers } = await admin
    .from('profiles')
    .select('id, first_name, last_name, grading_types')
    .contains('roles', ['council'])
    .is('status', null)

  // Fetch exclusions for this ordinand
  const { data: exclusions } = await admin
    .from('grading_exclusions')
    .select('council_member_id')
    .eq('ordinand_id', ordinand_id)

  const excludedIds = new Set((exclusions || []).map(e => e.council_member_id))

  // Fetch all existing assignments for this ordinand (for breadth tracking)
  const { data: existingAssignments } = await admin
    .from('grading_assignments')
    .select('council_member_id, ordinand_requirements!inner(ordinand_id)')
    .eq('ordinand_requirements.ordinand_id', ordinand_id)

  const alreadyAssignedIds = new Set((existingAssignments || []).map(a => a.council_member_id))

  // Fetch pending counts per council member (requirements not complete)
  const { data: pendingCounts } = await admin
    .from('grading_assignments')
    .select('council_member_id, ordinand_requirements!inner(status)')
    .neq('ordinand_requirements.status', 'complete')

  const pendingMap: Record<string, number> = {}
  for (const row of pendingCounts || []) {
    pendingMap[row.council_member_id] = (pendingMap[row.council_member_id] || 0) + 1
  }

  // Fetch 12-month assignment counts per council member
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  const { data: twelveMoCounts } = await admin
    .from('grading_assignments')
    .select('council_member_id')
    .gte('assigned_at', twelveMonthsAgo.toISOString())

  const twelveMonthMap: Record<string, number> = {}
  for (const row of twelveMoCounts || []) {
    twelveMonthMap[row.council_member_id] = (twelveMonthMap[row.council_member_id] || 0) + 1
  }

  let assigned = 0
  let skipped = 0
  const errors: string[] = []

  for (const req of unassigned) {
    const reqType = (req.requirement_templates as any)?.type as string

    // Filter eligible council members
    const eligible = (councilMembers || []).filter(m => {
      if (excludedIds.has(m.id)) return false
      // Only restrict by type if the member has explicit grading_types set (non-empty array)
      if (Array.isArray(m.grading_types) && m.grading_types.length > 0 && !m.grading_types.includes(reqType)) return false
      return true
    })

    if (eligible.length === 0) {
      errors.push(`No eligible grader for requirement ${req.id} (type: ${reqType})`)
      skipped++
      continue
    }

    // Score and sort: new-to-ordinand first, then lowest pending, then lowest 12-month
    const scored = eligible.map(m => ({
      id: m.id,
      alreadyAssigned: alreadyAssignedIds.has(m.id) ? 1 : 0,
      pending: pendingMap[m.id] || 0,
      twelveMonth: twelveMonthMap[m.id] || 0,
    }))

    scored.sort((a, b) =>
      a.alreadyAssigned - b.alreadyAssigned ||
      a.pending - b.pending ||
      a.twelveMonth - b.twelveMonth
    )

    const winner = scored[0]

    const { error } = await admin
      .from('grading_assignments')
      .insert({
        ordinand_requirement_id: req.id,
        council_member_id: winner.id,
        assigned_by: user.id,
      })

    if (error) {
      errors.push(`Failed to assign req ${req.id}: ${error.message}`)
      skipped++
    } else {
      // Update breadth tracking for subsequent requirements in this loop
      alreadyAssignedIds.add(winner.id)
      // Update pending count for subsequent scoring
      pendingMap[winner.id] = (pendingMap[winner.id] || 0) + 1
      assigned++
    }
  }

  return NextResponse.json({ assigned, skipped, errors })
}
