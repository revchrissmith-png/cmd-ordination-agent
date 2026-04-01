-- Add grading type restrictions to council member profiles
-- null = unrestricted (can grade all types), non-null = hard restriction
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grading_types text[];

-- Conflict-of-interest exclusions: council members who should never be
-- auto-assigned to a specific ordinand (e.g. supervisor, family member)
CREATE TABLE IF NOT EXISTS grading_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordinand_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  council_member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(ordinand_id, council_member_id)
);

ALTER TABLE grading_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exclusions" ON grading_exclusions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND roles @> ARRAY['admin'])
  );
