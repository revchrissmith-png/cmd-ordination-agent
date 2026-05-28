// app/api/admin/attestations/clear/route.ts
// POST: admin clears an ordinand's attestation so they can re-attest.
//
// Body: { profile_id: uuid, kind: AttestationKind }
//
// Implemented as a hard DELETE since the unique (profile_id, kind)
// constraint already blocks re-attestation while the row exists. If
// audit history of clears becomes necessary, add a separate
// attestation_clears log table.
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../../lib/api-auth'
import { ATTESTATION_KINDS, type AttestationKind } from '../../../../../lib/attestations'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { profile_id, kind } = body ?? {}

  if (typeof profile_id !== 'string' || !isValidUUID(profile_id)) {
    return NextResponse.json({ error: 'Invalid profile_id' }, { status: 400 })
  }
  if (typeof kind !== 'string' || !ATTESTATION_KINDS.includes(kind as AttestationKind)) {
    return NextResponse.json({ error: 'Unknown attestation kind' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('ordinand_attestations')
    .delete()
    .eq('profile_id', profile_id)
    .eq('kind', kind)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
