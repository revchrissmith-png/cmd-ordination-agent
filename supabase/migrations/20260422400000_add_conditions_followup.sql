-- Add follow-up tracking fields for conditional / deferred interview outcomes.
-- conditions_due_date: when conditions must be fulfilled
-- conditions_met_at: timestamp when admin approved conditions as met
-- conditions_approved_by: the admin who approved

ALTER TABLE oral_interviews
  ADD COLUMN IF NOT EXISTS conditions_due_date DATE,
  ADD COLUMN IF NOT EXISTS conditions_met_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conditions_approved_by UUID REFERENCES profiles(id);
