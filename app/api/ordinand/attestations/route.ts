// app/api/ordinand/attestations/route.ts
// POST: ordinand submits a personal-pledge attestation.
//
// Body: { kind: AttestationKind, signature_name: string }
//
// The pledge text is resolved server-side from lib/attestations so the
// client can't fudge what they "agreed to." The signature is the typed
// name; we store it verbatim — no enforcement against profile name,
// since legal/preferred names may differ.
//
// One attestation per (ordinand, kind) — the UNIQUE constraint on the
// table makes re-attestation impossible until admin clears.
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, serviceClient } from '../../../../lib/api-auth'
import { ATTESTATION_KINDS, ATTESTATION_TEXT, type AttestationKind } from '../../../../lib/attestations'

export async function POST(req: NextRequest) {
  const auth = await authenticateUser(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { kind, signature_name } = body ?? {}

  if (typeof kind !== 'string' || !ATTESTATION_KINDS.includes(kind as AttestationKind)) {
    return NextResponse.json({ error: 'Unknown attestation kind' }, { status: 400 })
  }
  if (typeof signature_name !== 'string' || signature_name.trim().length < 2) {
    return NextResponse.json({ error: 'Signature is required' }, { status: 400 })
  }

  const attestation_text = ATTESTATION_TEXT[kind as AttestationKind]

  const { data, error } = await serviceClient
    .from('ordinand_attestations')
    .insert({
      profile_id:       auth.user.id,
      kind,
      signature_name:   signature_name.trim(),
      attestation_text,
    })
    .select('id, attested_at')
    .single()

  if (error) {
    // 23505 = unique_violation → already attested
    const isDuplicate = (error as any)?.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? 'You have already attested to this requirement.' : error.message },
      { status: isDuplicate ? 409 : 500 },
    )
  }

  return NextResponse.json({ ok: true, id: data?.id, attested_at: data?.attested_at })
}
