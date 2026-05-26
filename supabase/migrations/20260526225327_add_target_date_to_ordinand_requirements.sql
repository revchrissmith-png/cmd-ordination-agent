-- Add self-imposed target submission dates to ordinand requirements.
--
-- Ordinands propose a date for each active requirement. The June 1 forcing
-- function in the UI blocks ordinand dashboard access until every active
-- (non-waived, non-complete) requirement has a target_date set. Past dates
-- are permitted — ordinands may revise after slipping.
--
-- The existing row-level UPDATE policy "Ordinands update own requirements
-- status" already permits ordinands to update any column on their own rows
-- (it gates on row ownership, not column list), so no policy change needed.

ALTER TABLE ordinand_requirements
  ADD COLUMN IF NOT EXISTS target_date        date,
  ADD COLUMN IF NOT EXISTS target_date_set_at timestamptz;

COMMENT ON COLUMN ordinand_requirements.target_date IS
  'Self-imposed submission date proposed by the ordinand. Nullable; null means not yet set. Past dates allowed (revision after slipping).';
COMMENT ON COLUMN ordinand_requirements.target_date_set_at IS
  'Timestamp of the most recent target_date update. Refreshed on every change.';
