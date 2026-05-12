// app/components/SubmissionPauseBanner.tsx
// Hook + banner for the ordinand-submission pause window.
// Real enforcement is in Postgres (restrictive RLS policy on submissions).
// This component is the UX surface: the banner and the disabled-button state.
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase/client'

export type SubmissionWindow = {
  id:            string
  start_at:      string
  end_at:        string
  banner_title:  string
  banner_body:   string
}

type State = {
  paused:  boolean
  window:  SubmissionWindow | null
  loading: boolean
}

/**
 * Returns the currently-active submission window, or null if submissions are open.
 * Backed by a real-time-ish poll (every 60 s) so the banner appears/disappears
 * within a minute of the window boundary without a page refresh.
 */
export function useSubmissionPause(): State {
  const [state, setState] = useState<State>({ paused: false, window: null, loading: true })

  useEffect(() => {
    let cancelled = false

    async function check() {
      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('submission_windows')
        .select('id, start_at, end_at, banner_title, banner_body')
        .lte('start_at', nowIso)
        .gt('end_at', nowIso)
        .order('start_at', { ascending: false })
        .limit(1)

      if (cancelled) return
      if (error) {
        // Don't block submission UX on a banner query failure — degrade to "not paused".
        setState({ paused: false, window: null, loading: false })
        return
      }

      const win = (data?.[0] as SubmissionWindow | undefined) ?? null
      setState({ paused: !!win, window: win, loading: false })
    }

    check()
    const interval = setInterval(check, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return state
}

/**
 * Format the end_at timestamp in Regina time for the banner copy.
 * America/Regina is CST year-round (no DST), so this is stable across the
 * 2026-05-25 → 2026-06-01 window even though the rest of Canada shifts.
 */
export function formatReginaTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone:    'America/Regina',
    weekday:     'long',
    month:       'long',
    day:         'numeric',
    hour:        'numeric',
    minute:      '2-digit',
    hour12:      true,
    timeZoneName: 'short',
  })
}

type BannerProps = {
  /** Optional placement hint — adjusts the surrounding spacing. Default 'page'. */
  placement?: 'page' | 'detail'
}

export default function SubmissionPauseBanner({ placement = 'page' }: BannerProps) {
  const { paused, window: win, loading } = useSubmissionPause()

  if (loading || !paused || !win) return null

  const resumesAt = formatReginaTime(win.end_at)
  const margin    = placement === 'detail' ? 'mb-4' : 'mb-6'

  return (
    <div
      role="status"
      className={`${margin} rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 sm:px-5 py-4 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className="text-xl leading-none mt-0.5">⏸</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm sm:text-base text-amber-900">{win.banner_title}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            {win.banner_body}
          </p>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-amber-800">
            Submissions resume {resumesAt}.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline disabled-submit tooltip text shown when buttons are blocked.
 * Centralized so the same wording renders on every disabled control.
 */
export const SUBMIT_PAUSED_TOOLTIP =
  'Submissions are paused for the council quiet week. They resume Monday June 1 at 8 a.m. Central.'
