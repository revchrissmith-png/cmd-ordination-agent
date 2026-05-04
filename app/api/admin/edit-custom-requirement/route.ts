// app/api/admin/edit-custom-requirement/route.ts
// Admin-only endpoint to edit a custom (non-template) requirement's title,
// description, or type. Refuses if the requirement is already complete.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'

const VALID_TYPES = ['book_report', 'paper', 'sermon', 'other'] as const

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const { requirementId, title, description, type } = await req.json().catch(() => ({}))

  if (!requirementId || !isValidUUID(requirementId)) {
    return NextResponse.json({ error: 'Invalid requirementId' }, { status: 400 })
  }

  const { data: req_, error: reqErr } = await serviceClient
    .from('ordinand_requirements')
    .select('id, template_id, status')
    .eq('id', requirementId)
    .single()

  if (reqErr || !req_) {
    return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
  }
  if (req_.template_id !== null) {
    return NextResponse.json({ error: 'Cannot edit a template-based requirement' }, { status: 400 })
  }
  if (req_.status === 'complete') {
    return NextResponse.json({ error: 'Cannot edit a completed requirement' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (title !== undefined) {
    if (!title?.trim()) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    update.custom_title = title.trim()
  }
  if (description !== undefined) update.custom_description = description?.trim() ?? null
  if (type !== undefined) {
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    update.custom_type = type
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('ordinand_requirements')
    .update(update)
    .eq('id', requirementId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
