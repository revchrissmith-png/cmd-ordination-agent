// lib/mentor-progress.ts
// Shared content + helpers for periodic mentor "progress check-ins".
// Spec: Specs/cmd-mentor-progress-evaluations-spec.md
import { wrapEmail } from './email-templates'
import { SITE_URL } from './config'

export type ProgressRound = 1 | 2

// Months relative to the cohort's final submission deadline D.
export const ROUND_OFFSET_MONTHS: Record<ProgressRound, number> = { 1: -23, 2: -11 }

// "YYYY-MM-DD" ± N months, clamping the day to the target month's length.
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, 1))
  base.setUTCMonth(base.getUTCMonth() + months)
  const ty = base.getUTCFullYear()
  const tm = base.getUTCMonth() // 0-based
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  const day = String(Math.min(d, lastDay)).padStart(2, '0')
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${day}`
}

// Regina is CST year-round (UTC-6, no DST).
export function reginaToday(now: Date = new Date()): string {
  return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// The three narrative prompts (item 4 "wants to meet" + comments are handled
// inline by the form). Keys match mentor_progress_checkins columns.
export const PROGRESS_QUESTIONS: { key: 'q_meeting_diligence' | 'q_pace' | 'q_struggles'; label: (name: string) => string }[] = [
  {
    key: 'q_meeting_diligence',
    label: n => `How diligent has ${n} been in arranging and keeping your mentoring meetings this period?`,
  },
  {
    key: 'q_pace',
    label: n => `How is ${n} doing at keeping pace with their assignments — and what do you see behind that (the "why")?`,
  },
  {
    key: 'q_struggles',
    label: () => `Are there any struggles or concerns that may need early attention or course-correction before they become urgent?`,
  },
]

export function buildCheckinEmail(opts: { ordinandName: string; round: ProgressRound; token: string }): { subject: string; html: string } {
  const { ordinandName, round, token } = opts
  const url = `${SITE_URL}/progress-checkin/${token}`
  const subject = `Mentor check-in for ${ordinandName} — Canadian Midwest District`
  const inner =
    `<p style="color:#1e293b;font-size:16px;margin:0 0 16px;">Hello,</p>` +
    `<p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">As ${ordinandName}'s mentor through the ordination process, the Canadian Midwest District invites a brief check-in (#${round} of two before the final evaluation). It's short — a few narrative questions about how things are going — and it helps us support ${ordinandName} well and step in early if needed.</p>` +
    `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#00426A;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:6px;">Complete the check-in</a></p>` +
    `<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">No login required. If the button doesn't work, paste this into your browser:<br>${url}</p>`
  return { subject, html: wrapEmail(inner) }
}
