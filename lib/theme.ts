// lib/theme.ts
// Shared colour constants for the CMD Ordination Portal.
// Replaces the duplicated `const C = { ... }` in 16+ files.

export const C = {
  allianceBlue: '#0077C8',
  deepSea: '#00426A',
  cloudGray: '#EAEAEE',
  white: '#ffffff',
} as const

export type Rating = 'insufficient' | 'adequate' | 'good' | 'excellent' | 'exceptional'
export type Status = 'not_started' | 'submitted' | 'under_review' | 'revision_required' | 'complete' | 'waived'

export const RATINGS = ['insufficient', 'adequate', 'good', 'excellent', 'exceptional'] as const

export const RATING_LABELS: Record<Rating, string> = {
  insufficient: 'Insufficient',
  adequate: 'Adequate',
  good: 'Good',
  excellent: 'Excellent',
  exceptional: 'Exceptional',
}

export const RATING_COLOUR: Record<Rating, string> = {
  insufficient: 'bg-red-100 text-red-700',
  adequate: 'bg-amber-100 text-amber-700',
  good: 'bg-blue-100 text-blue-700',
  excellent: 'bg-green-100 text-green-700',
  exceptional: 'bg-purple-100 text-purple-700',
}

export const STATUS_CONFIG: Record<Status, { label: string; colour: string; dot: string }> = {
  not_started:       { label: 'Not Started',      colour: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-300' },
  submitted:         { label: 'Submitted',         colour: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400' },
  under_review:      { label: 'Under Review',      colour: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  revision_required: { label: 'Revision Required', colour: 'bg-red-100 text-red-700',       dot: 'bg-red-400' },
  complete:          { label: 'Complete',           colour: 'bg-green-100 text-green-700',   dot: 'bg-green-400' },
  waived:            { label: 'Waived',              colour: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
}

export const TYPE_LABELS: Record<string, string> = {
  book_report: 'Book Reports',
  paper: 'Theological Papers',
  sermon: 'Sermons',
  other: 'Other Requirements',
}

export const TOPIC_LABELS: Record<string, string> = {
  christ_centred:   'Christ-Centred Life and Ministry',
  spirit_empowered: 'Spirit-Empowered Life and Ministry',
  mission_focused:  'Mission-Focused Life and Ministry',
  scripture:        'The Scriptures',
  divine_healing:   'Divine Healing',
}
