-- Migration: add final_scores to oral_interviews
-- Purpose: Store the chair's official consensus grades per interview section,
-- recorded as part of the decision. Same shape as individual scores JSONB:
-- { "personal_history": "good", "holy_scripture": "excellent", ... }
-- These are the official council grades — distinct from individual member scores.

ALTER TABLE public.oral_interviews
  ADD COLUMN IF NOT EXISTS final_scores JSONB DEFAULT '{}';
