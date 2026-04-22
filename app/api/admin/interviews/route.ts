// app/api/admin/interviews/route.ts
// List all oral interviews (GET) or schedule a new one (POST).
// Admin-only.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'

/** GET /api/admin/interviews?ordinandId=<uuid> */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const ordinandId = req.nextUrl.searchParams.get('ordinandId')

  let query = serviceClient
    .from('oral_interviews')
    .select('*, conducted_by_profile:profiles!oral_interviews_conducted_by_fkey(first_name, last_name)')
    .order('scheduled_date', { ascending: false })

  if (ordinandId) {
    if (!isValidUUID(ordinandId)) {
      return NextResponse.json({ error: 'Invalid ordinandId' }, { status: 400 })
    }
    query = query.eq('ordinand_id', ordinandId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 })
  }

  return NextResponse.json({ interviews: data })
}

/** POST /api/admin/interviews — schedule a new oral interview */
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const body = await req.json()
  const { ordinandId, scheduledDate, councilPresent, conductedBy } = body

  if (!ordinandId || !isValidUUID(ordinandId)) {
    return NextResponse.json({ error: 'Valid ordinandId is required' }, { status: 400 })
  }
  if (!scheduledDate) {
    return NextResponse.json({ error: 'scheduledDate is required' }, { status: 400 })
  }

  // Check ordinand exists and has ordinand role
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, roles')
    .eq('id', ordinandId)
    .single()
  if (!profile || !profile.roles?.includes('ordinand')) {
    return NextResponse.json({ error: 'Ordinand not found' }, { status: 404 })
  }

  const { data, error } = await serviceClient
    .from('oral_interviews')
    .insert({
      ordinand_id: ordinandId,
      scheduled_date: scheduledDate,
      council_present: councilPresent ?? [],
      conducted_by: conductedBy && isValidUUID(conductedBy) ? conductedBy : null,
      created_by: auth.user.id,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to schedule interview' }, { status: 500 })
  }

  return NextResponse.json({ interview: data }, { status: 201 })
}
