-- Migration: archive_reports table
-- Purpose: Persist generated archive/final reports as a permanent record.
-- Stores the full report content so it doesn't need to be re-generated.

CREATE TABLE IF NOT EXISTS public.archive_reports (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ordinand_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interview_id    UUID        REFERENCES public.oral_interviews(id) ON DELETE SET NULL,
  report_text     TEXT        NOT NULL,          -- full plaintext report
  ai_summary      TEXT        DEFAULT '',        -- AI executive summary snapshot
  interview_date  DATE,
  interview_result TEXT,
  ordination_date  DATE,
  officiant        TEXT        DEFAULT '',
  generated_by    UUID        REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archive_reports_ordinand
  ON public.archive_reports(ordinand_id);

ALTER TABLE public.archive_reports ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage archive reports"
  ON public.archive_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND roles @> ARRAY['admin']::text[]
    )
  );

-- Council: read
CREATE POLICY "Council can view archive reports"
  ON public.archive_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND roles @> ARRAY['council']::text[]
    )
  );
