// lib/surveys/types.ts
// Shared types for cohort-event feedback surveys.
//
// The shape stored in cohort_event_surveys.questions (JSONB) is exactly
// `Question[]` below. The composer copies the seed into the DB at survey
// creation time so historical surveys stay frozen even if the seed in
// code is later edited.

export type ScaleQuestion = {
  id:           string
  type:         'scale'
  prompt:       string
  scale_min:    number
  scale_max:    number
  scale_labels: { min: string; max: string }
  required:     boolean
}

export type SingleSelectQuestion = {
  id:       string
  type:     'single'
  prompt:   string
  options:  { value: string; label: string }[]
  required: boolean
}

export type MultiSelectQuestion = {
  id:                string
  type:              'multi'
  prompt:            string
  options:           { value: string; label: string }[]
  allow_other_text:  boolean
  required:          boolean
}

export type TextQuestion = {
  id:         string
  type:       'text'
  prompt:     string
  helper?:    string
  multiline:  boolean
  required:   boolean
}

export type Question =
  | ScaleQuestion
  | SingleSelectQuestion
  | MultiSelectQuestion
  | TextQuestion

export type Section = {
  heading:    string
  questions:  Question[]
}

export type SurveyTemplate = {
  slug:       string   // matches the filename, used in audit/logging
  title:      string
  intro:      string
  sections:   Section[]
}
