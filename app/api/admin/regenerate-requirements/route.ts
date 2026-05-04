// app/api/admin/regenerate-requirements/route.ts
// Regenerates paper/sermon requirements for all ordinands in a cohort
// when the cohort's sermon topic changes. Only affects not_started requirements.
// Admin-only.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { cohortId } = body

  if (!cohortId || !isValidUUID(cohortId)) {
    return NextResponse.json({ error: 'Invalid cohortId' }, { status: 400 })
  }

  // 1. Get the cohort's current sermon topic
  const { data: cohort, error: cohortErr } = await serviceClient
    .from('cohorts')
    .select('id, sermon_topic')
    .eq('id', cohortId)
    .single()

  if (cohortErr || !cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
  }

  // 2. Get all requirement templates
  const { data: templates } = await serviceClient
    .from('requirement_templates')
    .select('id, type, topic, title')

  if (!templates) {
    return NextResponse.json({ error: 'Could not load templates' }, { status: 500 })
  }

  // 3. Determine which templates this cohort should have
  const expectedTemplateIds = new Set(
    templates.filter(t => {
      if (t.type === 'book_report') return true
      if (t.type === 'paper') return t.topic !== cohort.sermon_topic
      if (t.type === 'sermon') return t.topic === cohort.sermon_topic && !t.title?.includes('placeholder')
      return false
    }).map(t => t.id)
  )

  // 4. Get all ordinands in this cohort, skipping anyone on a custom track
  // (their requirement set is curated by an admin and must not be mass-mutated).
  const { data: ordinands } = await serviceClient
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('cohort_id', cohortId)
    .eq('is_custom_track', false)
    .contains('roles', ['ordinand'])

  if (!ordinands || ordinands.length === 0) {
    return NextResponse.json({ success: true, message: 'No standard-track ordinands in this cohort', updated: 0 })
  }

  const results: { ordinandId: string; name: string; added: number; removed: number; skipped: number }[] = []

  for (const ordinand of ordinands) {
    // 5. Get this ordinand's current requirements for this cohort
    const { data: currentReqs } = await serviceClient
      .from('ordinand_requirements')
      .select('id, template_id, status')
      .eq('ordinand_id', ordinand.id)
      .eq('cohort_id', cohortId)

    if (!currentReqs) continue

    const currentTemplateIds = new Set(currentReqs.map(r => r.template_id))

    // 6. Find templates to add (expected but not present)
    const toAdd = Array.from(expectedTemplateIds).filter(id => !currentTemplateIds.has(id))

    // 7. Find requirements to remove (present but not expected)
    // Only remove not_started requirements — never touch in-progress or completed work
    // Never remove custom (template_id IS NULL) rows — those are admin-authored
    const toRemove = currentReqs.filter(r =>
      r.template_id !== null &&
      !expectedTemplateIds.has(r.template_id) &&
      r.status === 'not_started' &&
      // Only remove paper/sermon types (never book reports)
      templates.find(t => t.id === r.template_id)?.type !== 'book_report'
    )

    const skipped = currentReqs.filter(r =>
      !expectedTemplateIds.has(r.template_id) &&
      r.status !== 'not_started' &&
      templates.find(t => t.id === r.template_id)?.type !== 'book_report'
    ).length

    // 8. Execute changes
    if (toRemove.length > 0) {
      await serviceClient
        .from('ordinand_requirements')
        .delete()
        .in('id', toRemove.map(r => r.id))
    }

    if (toAdd.length > 0) {
      await serviceClient
        .from('ordinand_requirements')
        .insert(toAdd.map(templateId => ({
          ordinand_id: ordinand.id,
          template_id: templateId,
          cohort_id: cohortId,
          status: 'not_started',
        })))
    }

    results.push({
      ordinandId: ordinand.id,
      name: `${ordinand.first_name} ${ordinand.last_name}`,
      added: toAdd.length,
      removed: toRemove.length,
      skipped,
    })
  }

  const totalAdded = results.reduce((sum, r) => sum + r.added, 0)
  const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)

  return NextResponse.json({
    success: true,
    cohortId,
    sermonTopic: cohort.sermon_topic,
    ordinandCount: ordinands.length,
    totalAdded,
    totalRemoved,
    totalSkipped,
    details: results,
  })
}
