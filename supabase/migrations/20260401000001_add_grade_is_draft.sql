-- Allow council members to save partial grades without submitting
-- is_draft = true: work in progress, does not change requirement status
-- is_draft = false (default): final submitted grade
ALTER TABLE grades ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
