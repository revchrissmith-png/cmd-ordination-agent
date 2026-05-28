// lib/attestations.ts
// Canonical definitions for personal-pledge ordination requirements.
//
// These two requirements live in CMD policy as personal attestations
// rather than graded assignments. The portal records the ordinand's
// pledge by storing a typed-name signature alongside a verbatim
// snapshot of the pledge wording (so future seed edits don't rewrite
// history).
//
// Server is the authority on pledge text — the submit endpoint resolves
// the kind to ATTESTATION_TEXT[kind] and ignores any text supplied by
// the client. The client only sends `kind` + `signature_name`.

export type AttestationKind = 'alliance_manual' | 'bible_full'

export const ATTESTATION_KINDS: AttestationKind[] = ['alliance_manual', 'bible_full']

export const ATTESTATION_TITLE: Record<AttestationKind, string> = {
  alliance_manual: 'Reading of the Manual of The Alliance Canada',
  bible_full:      'Reading of the Whole Bible in a New Translation',
}

export const ATTESTATION_SUMMARY: Record<AttestationKind, string> = {
  alliance_manual:
    'CMD policy asks every ordinand to read the Manual of The Alliance Canada in its entirety before ordination.',
  bible_full:
    'CMD policy asks every ordinand to read the whole of Holy Scripture in a translation they had not previously read in full, during the ordination process.',
}

export const ATTESTATION_TEXT: Record<AttestationKind, string> = {
  alliance_manual:
    'Before God and the Ordaining Council of the Canadian Midwest District, I attest that I have read, in its entirety, the Manual of The Alliance Canada. I have engaged its content with seriousness and submit my ministry to its order.\n\nI make this attestation as a matter of personal pledge. I understand that this is a record of my own affirmation before the Council and that no further verification will be sought.',
  bible_full:
    'Before God and the Ordaining Council of the Canadian Midwest District, I attest that, since beginning the ordination process, I have read the whole of Holy Scripture — Genesis through Revelation — in a translation I had not previously read in its entirety.\n\nI have undertaken this reading as part of my preparation for ordained ministry. I make this attestation as a matter of personal pledge, knowing that this is a record of my own affirmation before the Council and that no further verification will be sought.',
}
