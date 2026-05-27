-- Replace per-requirement target_date with semi-annual commitment snapshots.
--
-- The 'target_date' columns shipped earlier today were a one-time June 1 gate.
-- After council feedback, the design pivoted: every six months (June 1 and
-- December 1), each ordinand picks 3-4 outstanding requirements they commit
-- to completing in the next cycle and proposes a date for each. Those
-- commitments are tracked on the dashboard for the cycle.
--
-- No production rows had non-null target_date values (column shipped ~hours
-- before this migration; only the test write in the verify session, which
-- the MCP layer rolled back). Safe to drop.

ALTER TABLE ordinand_requirements
  DROP COLUMN IF EXISTS target_date,
  DROP COLUMN IF EXISTS target_date_set_at;

CREATE TABLE commitments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordinand_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ordinand_requirement_id  uuid NOT NULL REFERENCES ordinand_requirements(id) ON DELETE CASCADE,
  cycle_start              date NOT NULL,            -- '2026-06-01', '2026-12-01', etc.
  target_date              date NOT NULL,
  committed_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ordinand_requirement_id, cycle_start)
);

CREATE INDEX commitments_ordinand_cycle_idx
  ON commitments (ordinand_id, cycle_start);

COMMENT ON TABLE  commitments IS
  'Semi-annual snapshot: 3-4 requirements an ordinand commits to finishing in the next cycle (Jun 1 → Nov 30 or Dec 1 → May 31), with a proposed target_date per item.';
COMMENT ON COLUMN commitments.cycle_start IS
  'First day of the cycle this commitment belongs to: a Jun 1 or Dec 1 date.';
COMMENT ON COLUMN commitments.target_date IS
  'Ordinand-proposed submission date; must fall within the cycle window (today ≤ target_date < next cycle_start).';

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

-- Ordinands see and create their own commitments. No UPDATE/DELETE yet — the
-- snapshot model means commitment lists don't change mid-cycle. (Date-edit
-- can be opened up later by adding a targeted UPDATE policy.)
CREATE POLICY "Ordinands see own commitments"
  ON commitments FOR SELECT
  USING (ordinand_id = auth.uid());

CREATE POLICY "Ordinands create own commitments"
  ON commitments FOR INSERT
  WITH CHECK (ordinand_id = auth.uid());

-- Admins manage everything.
CREATE POLICY "Admins manage all commitments"
  ON commitments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.roles @> ARRAY['admin']::text[]
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.roles @> ARRAY['admin']::text[]
  ));

-- Council members can read commitments for ordinands they grade.
CREATE POLICY "Council reads commitments for assigned ordinands"
  ON commitments FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM grading_assignments ga
    JOIN ordinand_requirements r ON r.id = ga.ordinand_requirement_id
    WHERE r.ordinand_id = commitments.ordinand_id
      AND ga.council_member_id = auth.uid()
  ));
