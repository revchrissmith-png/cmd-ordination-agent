-- Migration: interview_scores table + section_assignments on oral_interviews
-- Purpose: Store per-council-member scoring across all 10 interview sections,
-- and track which council member leads which interview section(s).

-- ── Section assignments on existing table ───────────────────────────────────
-- JSONB mapping: { section_id: council_member_uuid, ... }
-- Admin assigns day-of; determines who leads questioning, not who scores.
ALTER TABLE public.oral_interviews
  ADD COLUMN IF NOT EXISTS section_assignments JSONB DEFAULT '{}';

-- ── Interview scores table ──────────────────────────────────────────────────
-- Each council member submits one row per interview with ratings for all 10 sections.
CREATE TABLE IF NOT EXISTS public.interview_scores (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id      UUID        NOT NULL REFERENCES public.oral_interviews(id) ON DELETE CASCADE,
  council_member_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scores            JSONB       NOT NULL DEFAULT '{}',
  -- scores shape: { "personal_history": "good", "holy_scripture": "excellent", ... }
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (interview_id, council_member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interview_scores_interview
  ON public.interview_scores(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_scores_member
  ON public.interview_scores(council_member_id);

-- RLS
ALTER TABLE public.interview_scores ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage interview scores"
  ON public.interview_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND roles @> ARRAY['admin']::text[]
    )
  );

-- Council members: can insert/update/read their own scores
CREATE POLICY "Council members manage own scores"
  ON public.interview_scores FOR ALL
  USING (auth.uid() = council_member_id)
  WITH CHECK (auth.uid() = council_member_id);

-- Council members: can read all scores for interviews they participated in
-- (needed for the aggregate view, though the chair/admin will typically use it)
CREATE POLICY "Council members read interview scores"
  ON public.interview_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND roles @> ARRAY['council']::text[]
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_interview_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_interview_scores_updated_at
  BEFORE UPDATE ON public.interview_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_scores_updated_at();
