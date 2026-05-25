// lib/progress-email.ts
// Shared builder for the "Progress Update" email body that admins send to
// ordinands from the candidate detail page. Used in two places:
//   - the modal preview (client)
//   - the send route (server)
// so the rendered preview is byte-for-byte what Resend ships.
//
// Returns inner HTML; callers wrap it with lib/email-templates.ts → wrapEmail.

const DEEP_SEA      = '#00426A'
const ALLIANCE_BLUE = '#0077C8'

export type ProgressEmailRequirement = {
  status: string
  requirement_templates?: { title?: string | null } | null
  custom_title?: string | null
}

export type ProgressEmailInput = {
  firstName:    string
  lastName:     string
  cohortLabel:  string
  /** Cohort's assignment_due_date — `YYYY-MM-DD` or null. Drives the pace banner. */
  cohortDueDate: string | null
  requirements: ProgressEmailRequirement[]
  /** Optional free-text comments appended by the sending admin. */
  extraComments?: string
}

/**
 * Pace tier — mirrors district-dashboard's `lib/ordination-data.ts` so an
 * ordinand seeing "critically behind" in their email matches the colour the
 * council sees on the dashboard's "Ordinands at Risk" KPI. Keep the
 * thresholds in sync with that file.
 *
 *   ratio = required_pace / EXPECTED_PACE  (0.5 reqs/month over ~34 months)
 *   critical   ratio >= 2.0  OR past-due with reqs remaining
 *   attention  1.0 < ratio < 2.0
 *   on_track   ratio <= 1.0
 */
export type PaceTier = 'on_track' | 'attention' | 'critical' | 'no_deadline' | 'finished'

export type PaceAssessment = {
  tier:           PaceTier
  remaining:      number
  /** Reqs/month required to finish by cohort deadline. `Infinity` if past-due. */
  requiredPace:   number
  /** Months left to deadline; negative if past-due. */
  monthsToDue:    number | null
  /** `YYYY-MM-DD` cohort deadline, formatted human-friendly. */
  dueDateLabel:   string | null
}

const EXPECTED_PACE      = 0.5    // reqs/month — program baseline
const AVG_DAYS_PER_MONTH = 30.4375

export type ProgressEmailSummary = {
  total:            number
  complete:         number
  inProgress:       number
  notStarted:       number
  revisionRequired: number
  progressPct:      number
  revisionItems:    { title: string }[]
  submittedItems:   { title: string; status: 'submitted' | 'under_review' }[]
}

const reqTitle = (r: ProgressEmailRequirement): string =>
  r.requirement_templates?.title ?? r.custom_title ?? 'Unknown'

/** Compute the same summary numbers shown in the admin UI's progress bar. */
export function summarizeProgress(requirements: ProgressEmailRequirement[]): ProgressEmailSummary {
  // Match candidates/[id]/page.tsx — waived rows are excluded from totals.
  const active = requirements.filter(r => r.status !== 'waived')
  const total            = active.length
  const complete         = active.filter(r => r.status === 'complete').length
  const submitted        = active.filter(r => r.status === 'submitted').length
  const underReview      = active.filter(r => r.status === 'under_review').length
  const revisionRequired = active.filter(r => r.status === 'revision_required').length
  const notStarted       = active.filter(r => r.status === 'not_started').length

  const revisionItems = active
    .filter(r => r.status === 'revision_required')
    .map(r => ({ title: reqTitle(r) }))

  const submittedItems = active
    .filter(r => r.status === 'submitted' || r.status === 'under_review')
    .map(r => ({ title: reqTitle(r), status: r.status as 'submitted' | 'under_review' }))

  return {
    total,
    complete,
    inProgress: submitted + underReview + revisionRequired,
    notStarted,
    revisionRequired,
    progressPct: total > 0 ? Math.round((complete / total) * 100) : 0,
    revisionItems,
    submittedItems,
  }
}

/**
 * Classify the ordinand's pace against the cohort deadline. Mirrors
 * district-dashboard's logic so the colour the ordinand sees matches the
 * colour the council sees.
 *
 * "Remaining" = active reqs the ordinand can act on now. Excludes:
 *   - waived (not counted toward totals)
 *   - complete (done)
 *   - submitted / under_review (ball is in council's court — not the
 *     ordinand's fault if it sits)
 * Revision-required stays counted: the ball is back in the ordinand's court.
 */
export function assessPace(
  requirements: ProgressEmailRequirement[],
  cohortDueDate: string | null,
): PaceAssessment {
  const active   = requirements.filter(r => r.status !== 'waived')
  const complete = active.filter(r => r.status === 'complete').length
  const inFlight = active.filter(r => r.status === 'submitted' || r.status === 'under_review').length
  const remaining = Math.max(0, active.length - complete - inFlight)

  const dueDateLabel = cohortDueDate
    ? new Date(cohortDueDate + 'T12:00:00').toLocaleDateString('en-CA', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null

  if (!cohortDueDate) {
    return { tier: 'no_deadline', remaining, requiredPace: 0, monthsToDue: null, dueDateLabel: null }
  }
  if (remaining === 0) {
    return { tier: 'finished', remaining: 0, requiredPace: 0, monthsToDue: null, dueDateLabel }
  }

  // America/Regina is UTC-6 year-round (no DST in Saskatchewan).
  const dueMs = new Date(cohortDueDate + 'T00:00:00-06:00').getTime()
  const monthsToDue = (dueMs - Date.now()) / (AVG_DAYS_PER_MONTH * 24 * 60 * 60 * 1000)

  if (monthsToDue <= 0) {
    return { tier: 'critical', remaining, requiredPace: Infinity, monthsToDue, dueDateLabel }
  }

  const requiredPace = remaining / monthsToDue
  const ratio        = requiredPace / EXPECTED_PACE
  const tier: PaceTier = ratio >= 2.0 ? 'critical' : ratio > 1.0 ? 'attention' : 'on_track'
  return { tier, remaining, requiredPace, monthsToDue, dueDateLabel }
}

/** Plain-text subject line. */
export function buildProgressEmailSubject(input: { firstName: string; lastName: string }): string {
  return `CMD Ordination Progress Update — ${input.firstName} ${input.lastName}`
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, c => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;' : '&#39;'
  ))

const paragraphsFromText = (text: string): string =>
  text
    .split(/\n{2,}/)
    .map(p => `<p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 12px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

/**
 * Build the inner email HTML (no wrap). Pass through wrapEmail() before sending.
 */
export function buildProgressEmailBody(input: ProgressEmailInput): string {
  const { firstName, lastName, cohortLabel, cohortDueDate, requirements, extraComments } = input
  const s = summarizeProgress(requirements)
  const pace = assessPace(requirements, cohortDueDate)

  const fullName = `${firstName} ${lastName}`

  const li = (label: string) =>
    `<li style="margin:4px 0;color:#334155;font-size:14px;">${escapeHtml(label)}</li>`

  const revisionSection = s.revisionItems.length > 0
    ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;padding:14px 18px;margin:18px 0;">
         <p style="color:#991b1b;font-weight:bold;font-size:14px;margin:0 0 8px;">Action required — please revise and resubmit:</p>
         <ul style="margin:0;padding-left:20px;">${s.revisionItems.map(r => li(r.title)).join('')}</ul>
       </div>`
    : ''

  const inProgressSection = s.submittedItems.length > 0
    ? `<div style="background:#f0f7ff;border-left:4px solid ${ALLIANCE_BLUE};border-radius:4px;padding:14px 18px;margin:18px 0;">
         <p style="color:${DEEP_SEA};font-weight:bold;font-size:14px;margin:0 0 8px;">In progress — currently under review:</p>
         <ul style="margin:0;padding-left:20px;">${s.submittedItems.map(r =>
           li(`${r.title} — ${r.status === 'submitted' ? 'Submitted (awaiting review)' : 'Under Review'}`)
         ).join('')}</ul>
       </div>`
    : ''

  const commentsBlock = extraComments && extraComments.trim()
    ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;padding:14px 18px;margin:18px 0;">
         <p style="color:#92400e;font-weight:bold;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px;">A note from the council</p>
         ${paragraphsFromText(extraComments.trim()).replace(/color:#334155/g, 'color:#78350f')}
       </div>`
    : ''

  // ── Pace banner ───────────────────────────────────────────────────────
  // Uses the district design system's status palette (green / amber / red)
  // so what the ordinand sees in email matches what council sees on the
  // "Ordinands at Risk" KPI.
  const paceBanner = ((): string => {
    if (pace.tier === 'no_deadline') return '' // no honest signal to give

    const palette = {
      on_track:  { bg: '#ecfdf5', border: '#10b981', headFg: '#065f46', bodyFg: '#047857', icon: '✓', label: 'On track' },
      attention: { bg: '#fffbeb', border: '#f59e0b', headFg: '#92400e', bodyFg: '#b45309', icon: '◷', label: 'Slightly behind pace' },
      critical:  { bg: '#fef2f2', border: '#dc2626', headFg: '#991b1b', bodyFg: '#b91c1c', icon: '⚠', label: 'Critically behind pace' },
      finished:  { bg: '#ecfdf5', border: '#10b981', headFg: '#065f46', bodyFg: '#047857', icon: '✓', label: 'All requirements complete' },
    }[pace.tier]

    // Body copy: tier-specific framing of what to do about it.
    const body = ((): string => {
      if (pace.tier === 'finished') {
        return `Every active requirement is either complete or in front of the council. Nothing further is required of you at this time.${pace.dueDateLabel ? ` Your cohort deadline is <strong>${pace.dueDateLabel}</strong>.` : ''}`
      }
      if (pace.tier === 'critical' && !isFinite(pace.requiredPace)) {
        // Past-due with reqs remaining.
        return `Your cohort's deadline of <strong>${pace.dueDateLabel}</strong> has passed and you still have <strong>${pace.remaining} requirement${pace.remaining === 1 ? '' : 's'}</strong> outstanding. Please reach out to the District Ministry Centre as soon as possible to discuss your path forward.`
      }
      // Round up — partial-req-per-month doesn't translate into a real action.
      const perMonth = Math.max(1, Math.ceil(pace.requiredPace))
      const deadlineFrag = pace.dueDateLabel
        ? ` between now and your cohort deadline of <strong>${pace.dueDateLabel}</strong>`
        : ''
      const lead = pace.tier === 'on_track'
        ? 'You are on pace to finish ordination on time.'
        : pace.tier === 'attention'
          ? "You're slipping a little behind the cohort's pace. A small course-correction now keeps you out of trouble."
          : 'Your pace is now significantly behind what the cohort timeline requires. Please prioritise catching up — and reach out if you need help reshaping the plan.'
      return `${lead} To finish on time you need to complete about <strong>${perMonth} requirement${perMonth === 1 ? '' : 's'} per month</strong>${deadlineFrag}.`
    })()

    return `
      <div style="background:${palette.bg};border-left:4px solid ${palette.border};border-radius:4px;padding:14px 18px;margin:0 0 24px;">
        <p style="color:${palette.headFg};font-weight:bold;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;margin:0 0 6px;">
          ${palette.icon} ${palette.label}
        </p>
        <p style="color:${palette.bodyFg};font-size:14px;line-height:1.6;margin:0;">${body}</p>
      </div>`
  })()

  // Simple horizontal progress bar.
  const bar = `
    <div style="margin:18px 0 24px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <span style="color:${DEEP_SEA};font-weight:bold;font-size:14px;">Overall progress</span>
        <span style="color:${DEEP_SEA};font-weight:bold;font-size:14px;">${s.progressPct}%</span>
      </div>
      <div style="background:#e2e8f0;border-radius:999px;height:10px;overflow:hidden;">
        <div style="background:${ALLIANCE_BLUE};height:10px;width:${s.progressPct}%;"></div>
      </div>
      <p style="color:#64748b;font-size:12px;margin:6px 0 0;">${s.complete} of ${s.total} requirements complete &middot; ${escapeHtml(cohortLabel)}</p>
    </div>`

  return `
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 12px;">Dear ${escapeHtml(fullName)},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 12px;">Here is a summary of your current progress in the CMD ordination process.</p>
    ${bar}
    ${paceBanner}
    <table style="width:100%;border-collapse:collapse;margin:0 0 18px;">
      <tr>
        <td style="padding:8px 0;color:#334155;font-size:14px;">✓ Complete</td>
        <td style="padding:8px 0;color:#334155;font-size:14px;text-align:right;font-weight:bold;">${s.complete}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#334155;font-size:14px;">◷ In progress</td>
        <td style="padding:8px 0;color:#334155;font-size:14px;text-align:right;font-weight:bold;">${s.inProgress}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#334155;font-size:14px;">○ Not started</td>
        <td style="padding:8px 0;color:#334155;font-size:14px;text-align:right;font-weight:bold;">${s.notStarted}</td>
      </tr>
      ${s.revisionRequired > 0 ? `<tr>
        <td style="padding:8px 0;color:#991b1b;font-size:14px;">⚠ Revision required</td>
        <td style="padding:8px 0;color:#991b1b;font-size:14px;text-align:right;font-weight:bold;">${s.revisionRequired}</td>
      </tr>` : ''}
    </table>
    ${revisionSection}
    ${inProgressSection}
    ${commentsBlock}
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:18px 0 12px;">If you have any questions, please reach out to the District Ministry Centre.</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">In His service,<br><strong>CMD Ordaining Council</strong></p>
  `
}
