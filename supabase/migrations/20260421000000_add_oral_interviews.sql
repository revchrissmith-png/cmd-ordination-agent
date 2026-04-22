-- Migration: oral_interviews table
-- Purpose: Persistent record of scheduled and completed oral interviews.
-- Each ordinand should have at most one active (non-cancelled) interview at a time,
-- but may have multiple historical records (e.g. deferred → rescheduled).

CREATE TABLE IF NOT EXISTS public.oral_interviews (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ordinand_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date  DATE,                          -- planned interview date
  interview_date  DATE,                          -- actual date the interview was conducted
  status          TEXT        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled', 'in_progress', 'decided', 'cancelled')),
  result          TEXT        CHECK (result IN ('sustained', 'conditional', 'deferred', 'not_sustained')),
  council_present UUID[]      DEFAULT '{}',      -- IDs of council members present
  notes           TEXT        DEFAULT '',         -- notes taken during the interview
  decision_notes  TEXT        DEFAULT '',         -- council deliberation summary
  brief_snapshot  TEXT        DEFAULT '',         -- copy of the AI brief used
  conducted_by    UUID        REFERENCES public.profiles(id),  -- chair / lead interviewer
  ordination_date DATE,                          -- scheduled ordination service date
  officiant       TEXT        DEFAULT '',         -- who will officiate
  created_by      UUID        REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by ordinand
CREATE INDEX IF NOT EXISTS idx_oral_interviews_ordinand
  ON public.oral_interviews(ordinand_id);

-- Index for listing upcoming interviews
CREATE INDEX IF NOT EXISTS idx_oral_interviews_scheduled
  ON public.oral_interviews(scheduled_date)
  WHERE status = 'scheduled';

-- RLS
ALTER TABLE public.oral_interviews ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage interviews"
  ON public.oral_interviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND roles @> ARRAY['admin']::text[]
    )
  );

-- Council members: read-only
CREATE POLICY "Council members can view interviews"
  ON public.oral_interviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND roles @> ARRAY['council']::text[]
    )
  );

-- Ordinands: read their own (limited by column-level grants if needed later)
CREATE POLICY "Ordinands can view their own interview"
  ON public.oral_interviews FOR SELECT
  USING (auth.uid() = ordinand_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_oral_interview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_oral_interview_updated_at
  BEFORE UPDATE ON public.oral_interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_oral_interview_updated_at();
