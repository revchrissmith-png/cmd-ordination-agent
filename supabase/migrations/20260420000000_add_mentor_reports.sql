-- Create mentor_reports table for persisting monthly ordinand reports
-- Stores answers as JSONB keyed by "sectionIndex-questionIndex"
CREATE TABLE IF NOT EXISTS public.mentor_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ordinand_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- "YYYY-MM" format for deduplication
  answers JSONB NOT NULL DEFAULT '{}',
  is_draft BOOLEAN NOT NULL DEFAULT true,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ordinand_id, month)
);

-- RLS: ordinands can only access their own reports
ALTER TABLE public.mentor_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ordinands can view their own reports"
  ON public.mentor_reports FOR SELECT
  USING (auth.uid() = ordinand_id);

CREATE POLICY "Ordinands can insert their own reports"
  ON public.mentor_reports FOR INSERT
  WITH CHECK (auth.uid() = ordinand_id);

CREATE POLICY "Ordinands can update their own reports"
  ON public.mentor_reports FOR UPDATE
  USING (auth.uid() = ordinand_id);

CREATE POLICY "Admins can view all reports"
  ON public.mentor_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND roles @> ARRAY['admin']::text[]
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_mentor_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_mentor_report_updated_at
  BEFORE UPDATE ON public.mentor_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_mentor_report_updated_at();
