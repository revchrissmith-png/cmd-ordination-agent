-- Bespoke requirement tracks: admins can waive standard requirements
-- and add custom (non-template) requirements for individual ordinands.

ALTER TYPE requirement_status ADD VALUE IF NOT EXISTS 'waived';

ALTER TABLE public.ordinand_requirements
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE public.ordinand_requirements
  ADD COLUMN IF NOT EXISTS custom_title       TEXT,
  ADD COLUMN IF NOT EXISTS custom_description TEXT,
  ADD COLUMN IF NOT EXISTS custom_type        TEXT
      CHECK (custom_type IN ('book_report','paper','sermon','other')),
  ADD COLUMN IF NOT EXISTS waived_reason      TEXT,
  ADD COLUMN IF NOT EXISTS waived_by          UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS waived_at          TIMESTAMPTZ;

ALTER TABLE public.ordinand_requirements
  DROP CONSTRAINT IF EXISTS ordinand_requirements_template_or_custom_chk;

ALTER TABLE public.ordinand_requirements
  ADD CONSTRAINT ordinand_requirements_template_or_custom_chk
  CHECK (template_id IS NOT NULL
         OR (custom_title IS NOT NULL AND custom_type IS NOT NULL));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_custom_track    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_track_notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ordinand_requirements_custom_unique
  ON public.ordinand_requirements (ordinand_id, custom_title)
  WHERE template_id IS NULL;
