// lib/mentor-report-email.ts
// Server-side builder for the monthly mentor report email. Used by the send
// route (app/api/mentor-report/send) so the report the mentor receives is
// generated and dispatched by the portal — reliable, and tracked — instead of
// depending on the ordinand's local mail client (the old mailto: flow).
import { wrapEmail } from './email-templates'
import { SECTIONS } from './mentor-report-sections'

const DEEP_SEA = '#00426A'

function esc(s: string): string {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]!)
}

/** "2026-06" → "June 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(y, m - 1, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

export function buildMentorReportSubject(ordinandName: string, month: string): string {
  return `Monthly Mentor Report — ${ordinandName} — ${monthLabel(month)}`
}

/** True when at least one answer has content. */
export function hasAnyAnswer(answers: Record<string, string>): boolean {
  return Object.values(answers).some(v => String(v).trim().length > 0)
}

export function buildMentorReportHtml(opts: {
  ordinandName: string
  mentorName: string
  month: string
  answers: Record<string, string>
}): string {
  const { ordinandName, mentorName, month, answers } = opts
  const getAnswer = (si: number, qi: number) => String(answers[`${si}-${qi}`] ?? '').trim()

  let inner = `<p style="color:#1e293b;font-size:16px;margin:0 0 16px;">Dear ${esc(mentorName || 'Mentor')},</p>`
  inner += `<p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 8px;">Here is my monthly report for ${esc(monthLabel(month))}.</p>`

  SECTIONS.forEach((section, si) => {
    const qa = section.questions
      .map((q, qi) => ({ q, a: getAnswer(si, qi) }))
      .filter(x => x.a.length > 0)
    if (qa.length === 0) return

    inner += `<p style="color:${DEEP_SEA};font-weight:bold;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;margin:24px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">${esc(section.title)}</p>`
    qa.forEach(({ q, a }) => {
      inner += `<p style="color:#64748b;font-size:13px;font-weight:bold;margin:0 0 3px;">${esc(q)}</p>`
      inner += `<p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px;white-space:pre-wrap;">${esc(a)}</p>`
    })
  })

  inner += `<p style="color:#1e293b;font-size:15px;line-height:1.7;margin:28px 0 0;">In Christ,<br>${esc(ordinandName)}</p>`
  return wrapEmail(inner)
}
