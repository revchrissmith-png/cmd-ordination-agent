-- Add pardington_consent_at to profiles.
-- NULL = not yet consented; non-null timestamp = date/time of consent.
-- Checked client-side on the Pardington study page before chat loads.
-- Existing RLS policies already allow ordinands to update their own profile row.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pardington_consent_at TIMESTAMPTZ;
