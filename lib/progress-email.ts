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
  requirements: ProgressEmailRequirement[]
  /** Optional free-text comments appended by the sending admin. */
  extraComments?: string
}

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
  const { firstName, lastName, cohortLabel, requirements, extraComments } = input
  const s = summarizeProgress(requirements)

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
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:18px 0 12px;">If you have any questions, please reply to this email or reach out to the District Ministry Centre.</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">In His service,<br><strong>CMD Ordaining Council</strong></p>
  `
}
