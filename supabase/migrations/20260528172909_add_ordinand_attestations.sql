-- Personal attestations for non-graded ordination requirements.
--
-- Two requirements in CMD policy are personal pledges, not graded
-- assignments — reading the Alliance Canada manual end-to-end and
-- reading the whole Bible in a translation new to the ordinand. The
-- portal previously had no place to record these, so the ordinand had
-- nothing to do and the council had no record of attestation.
--
-- Design (per Chris, 2026-05-28):
--   - Typed-name signature at the moment of attestation, captured
--     alongside the exact pledge text the ordinand read.
--   - Ordinand cannot withdraw their own attestation; admin can clear
--     (DELETE the row) which lets the ordinand re-attest if needed.
--   - Council reads-only; this is recorded affirmation for the ordaining
--     decision, not a graded item.
--
-- The unique (profile_id, kind) constraint enforces "at most one active
-- attestation per kind per ordinand." Re-attestation after an admin
-- clear is fine because the prior row is gone.

CREATE TYPE attestation_kind AS ENUM ('alliance_manual', 'bible_full');

CREATE TABLE ordinand_attestations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind              attestation_kind NOT NULL,
  signature_name    text NOT NULL,
  attestation_text  text NOT NULL,
  attested_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, kind)
);

CREATE INDEX ordinand_attestations_profile_idx
  ON ordinand_attestations (profile_id);

COMMENT ON TABLE ordinand_attestations IS
  'Personal-pledge attestations for non-graded ordination requirements. signature_name is the full name the ordinand typed at the moment of attestation; attestation_text is a snapshot of the exact pledge wording they read and agreed to, so the record stays meaningful even if the seed wording is later edited. Admin clears = DELETE the row.';

COMMENT ON COLUMN ordinand_attestations.signature_name IS
  'Full name as typed by the ordinand on the signature line. Stored verbatim — not validated against profiles.full_name, since the legal/preferred name they use to sign may differ.';

COMMENT ON COLUMN ordinand_attestations.attestation_text IS
  'Snapshot of the exact pledge text the ordinand read and confirmed. Frozen on the row so future seed edits do not silently rewrite history.';

ALTER TABLE ordinand_attestations ENABLE ROW LEVEL SECURITY;

-- Ordinand: read + insert their own row only. No UPDATE / DELETE — the
-- pledge is permanent from their side. Admin clears via service role.
CREATE POLICY "Ordinands read own attestations"
  ON ordinand_attestations FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Ordinands insert own attestations"
  ON ordinand_attestations FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Council reads all attestations"
  ON ordinand_attestations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'council' = ANY (profiles.roles)
  ));

CREATE POLICY "Admins manage attestations"
  ON ordinand_attestations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'admin' = ANY (profiles.roles)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'admin' = ANY (profiles.roles)
  ));
