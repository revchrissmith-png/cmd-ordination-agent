-- Migration: add conditions field to oral_interviews
-- Purpose: Dedicated field for conditions attached to conditional/deferred outcomes.
-- Separate from decision_notes (general deliberation) to clearly surface actionable requirements.

ALTER TABLE public.oral_interviews
  ADD COLUMN IF NOT EXISTS conditions TEXT DEFAULT '';
