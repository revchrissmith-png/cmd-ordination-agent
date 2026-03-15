// utils/logActivity.ts
// Fire-and-forget activity logging. Never blocks the UI.
import { supabase } from './supabase/client'

export type EventType =
  | 'login'
  | 'ordinand_dashboard'
  | 'requirement_view'
  | 'submission'
  | 'study_agent'
  | 'council_dashboard'
  | 'grading_view'
  | 'grade_submitted'
  | 'process_guide'
  | 'profile_view'

export async function logActivity(
  userId: string,
  event: EventType,
  page?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      event_type: event,
      page: page ?? null,
      metadata: metadata ?? null,
    })
  } catch {
    // Silently swallow — logging must never break the app
  }
}
