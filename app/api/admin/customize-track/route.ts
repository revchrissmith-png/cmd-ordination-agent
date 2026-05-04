// app/api/admin/customize-track/route.ts
// Admin-only endpoint to customize an ordinand's requirement track:
//   - Toggle is_custom_track and set track notes
//   - Add custom (non-template) requirements
//   - Waive standard requirements with a reason
//   - Un-waive previously waived requirements
//
// Single-call atomicity is best-effort: each operation runs in sequence; partial
// failures are reported back. Waive/un-waive guardrail: only rows in not_started
// or waived can transition (mirrors the regenerate-requirements protection of
// in-progress and completed work).

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'

type CustomType = 'book_report' | 'paper' | 'sermon' | 'other'
const VALID_TYPES: CustomType[] = ['book_report', 'paper', 'sermon', 'other']

type Body = {
  ordinandId: string
  setIsCustomTrack?: boolean
  setNotes?: string | null
  addCustom?: { title: string; description: string; type: CustomType }[]
  waive?: { requirementId: string; reason: string }[]
  unwaive?: string[]
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const body = (await req.json().catch(() => ({}))) as Body
  const { ordinandId, setIsCustomTrack, setNotes, addCustom, waive, unwaive } = body

  if (!ordinandId || !isValidUUID(ordinandId)) {
    return NextResponse.json({ error: 'Invalid ordinandId' }, { status: 400 })
  }

  const { data: ordinand, error: ordErr } = await serviceClient
    .from('profiles')
    .select('id, cohort_id, roles')
    .eq('id', ordinandId)
    .single()

  if (ordErr || !ordinand) {
    return NextResponse.json({ error: 'Ordinand not found' }, { status: 404 })
  }
  if (!ordinand.roles?.includes('ordinand')) {
    return NextResponse.json({ error: 'Profile is not an ordinand' }, { status: 400 })
  }

  const errors: string[] = []
  let addedCount = 0
  let waivedCount = 0
  let unwaivedCount = 0

  // 1. Profile flags / notes
  if (setIsCustomTrack !== undefined || setNotes !== undefined) {
    const update: Record<string, unknown> = {}
    if (setIsCustomTrack !== undefined) update.is_custom_track = !!setIsCustomTrack
    if (setNotes !== undefined) update.custom_track_notes = setNotes ?? null
    const { error } = await serviceClient.from('profiles').update(update).eq('id', ordinandId)
    if (error) errors.push(`profile update: ${error.message}`)
  }

  // 2. Add custom requirements
  if (addCustom?.length) {
    for (const c of addCustom) {
      if (!c.title?.trim() || !VALID_TYPES.includes(c.type)) {
        errors.push(`invalid custom requirement: ${JSON.stringify(c)}`)
        continue
      }
    }
    const valid = addCustom.filter(c => c.title?.trim() && VALID_TYPES.includes(c.type))
    if (valid.length) {
      const rows = valid.map(c => ({
        ordinand_id: ordinandId,
        template_id: null,
        cohort_id: ordinand.cohort_id,
        status: 'not_started',
        custom_title: c.title.trim(),
        custom_description: c.description?.trim() ?? null,
        custom_type: c.type,
      }))
      const { error, count } = await serviceClient
        .from('ordinand_requirements')
        .insert(rows, { count: 'exact' })
      if (error) errors.push(`add custom: ${error.message}`)
      else addedCount = count ?? rows.length
    }
  }

  // 3. Waive existing requirements (only allowed if status = not_started)
  if (waive?.length) {
    const ids = waive.map(w => w.requirementId).filter(isValidUUID)
    const { data: existing } = await serviceClient
      .from('ordinand_requirements')
      .select('id, status')
      .in('id', ids)
      .eq('ordinand_id', ordinandId)

    const eligibleIds = new Set(
      (existing ?? []).filter(r => r.status === 'not_started').map(r => r.id)
    )

    for (const w of waive) {
      if (!eligibleIds.has(w.requirementId)) {
        errors.push(`cannot waive ${w.requirementId} (must be not_started and belong to this ordinand)`)
        continue
      }
      if (!w.reason?.trim()) {
        errors.push(`cannot waive ${w.requirementId}: reason required`)
        continue
      }
      const { error } = await serviceClient
        .from('ordinand_requirements')
        .update({
          status: 'waived',
          waived_reason: w.reason.trim(),
          waived_by: auth.user!.id,
          waived_at: new Date().toISOString(),
        })
        .eq('id', w.requirementId)
        .eq('ordinand_id', ordinandId)
      if (error) errors.push(`waive ${w.requirementId}: ${error.message}`)
      else waivedCount++
    }
  }

  // 4. Un-waive (revert to not_started)
  if (unwaive?.length) {
    const ids = unwaive.filter(isValidUUID)
    const { data: existing } = await serviceClient
      .from('ordinand_requirements')
      .select('id, status')
      .in('id', ids)
      .eq('ordinand_id', ordinandId)

    const eligibleIds = (existing ?? []).filter(r => r.status === 'waived').map(r => r.id)

    if (eligibleIds.length) {
      const { error, count } = await serviceClient
        .from('ordinand_requirements')
        .update({
          status: 'not_started',
          waived_reason: null,
          waived_by: null,
          waived_at: null,
        }, { count: 'exact' })
        .in('id', eligibleIds)
        .eq('ordinand_id', ordinandId)
      if (error) errors.push(`unwaive: ${error.message}`)
      else unwaivedCount = count ?? eligibleIds.length
    }

    const ineligible = ids.filter(id => !eligibleIds.includes(id))
    if (ineligible.length) errors.push(`cannot unwaive ${ineligible.join(', ')} (not currently waived)`)
  }

  return NextResponse.json({
    success: errors.length === 0,
    addedCount,
    waivedCount,
    unwaivedCount,
    errors: errors.length ? errors : undefined,
  }, { status: errors.length ? 207 : 200 })
}
