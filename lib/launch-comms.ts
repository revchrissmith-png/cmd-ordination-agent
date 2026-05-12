// lib/launch-comms.ts
// Render functions for the three launch-comms emails sent during the
// 2026 portal launch (May 14 / May 15 / June 1). Each function returns
// the full HTML email (wrapped in the standard portal template) plus subject.
//
// Copy is sourced verbatim from
//   Work/CMD Ordination Portal/Launch Comms — Drafts (Round 2).md
// and held here as TS constants so it ships with the deploy. Edit the
// constants below to revise copy.
import { wrapEmail } from './email-templates'

const DEEP_SEA = '#00426A'

// ── Helpers ─────────────────────────────────────────────────────────────────

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c]!)
}

// Render inline markdown-style bolds and italics. Body text only — caller
// is responsible for escaping any user-supplied values before passing in.
function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${DEEP_SEA};">$1</strong>`)
}

function paragraph(text: string): string {
  return `<p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">${renderInline(text)}</p>`
}

function salutation(firstName: string): string {
  return `<p style="color:#1e293b;font-size:16px;margin:0 0 16px;">${escape(firstName)},</p>`
}

function signoff(): string {
  return `
    <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:28px 0 0;">Blessings,</p>
    <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:14px 0 0;"><strong style="color:${DEEP_SEA};">Chris Smith</strong><br>Canadian Midwest District</p>`
}

function blessingBlock(lines: string[]): string {
  const ps = lines
    .map(l => `<p style="color:${DEEP_SEA};font-size:15px;line-height:1.8;font-style:italic;margin:0 0 14px;">${renderInline(l)}</p>`)
    .join('')
  return `
    <div style="background:#F8FAFC;border-left:4px solid ${DEEP_SEA};border-radius:4px;padding:20px 24px;margin:24px 0;">
      ${ps}
    </div>`
}

// ── 1. Council prep — sent Thursday, May 14 ────────────────────────────────

const COUNCIL_PREP_SUBJECT = 'Coming May 25 — your week with the new portal'

const COUNCIL_PREP_BODY: string[] = [
  `A short note before our Ordaining Council meetings later this month. On Monday May 25, the new CMD Ordination Portal opens for the Council at noon. You'll have exclusive access from May 25th through  Monday June 1 — to get familiar with the dashboard and your assigned marking before ordinand submissions start coming in. Submissions are paused for one week so you've got space to settle in.`,
  `We'll walk through the portal while we're together. The dashboard, smart grader assignment, exclusions, Pardington (now with conversation history). No prep needed. Just bring a laptop or tablet you can check email on.`,
  `Migration from Moodle is now complete. Every active ordinand is on the portal.`,
  `Ordinand submissions reopen Monday June 1 at 8 a.m. Central. That's when notifications will start flowing to you and the next chapter of CMD ordination begins in earnest.`,
  `Questions before we meet? Reach out to me directly.`,
]

export function renderCouncilPrep(firstName: string): { subject: string; html: string } {
  const body = salutation(firstName) + COUNCIL_PREP_BODY.map(paragraph).join('') + signoff()
  return { subject: COUNCIL_PREP_SUBJECT, html: wrapEmail(body) }
}

// ── 2. Ordinand prep — sent Friday, May 15 ─────────────────────────────────

const ORDINAND_PREP_SUBJECT = 'Coming June 1 — the new Ordination Portal'

const ORDINAND_PREP_BODY: string[] = [
  `In just over two weeks, on Monday June 1, the new CMD Ordination Portal opens for you. You'll find it at **ordination.canadianmidwest.ca**. A few things to know before then.`,
  `**Your submitted work is safe.** Everything has been moved over and will be live on the portal June 1: book reports you've turned in, feedback you've gotten back, papers you've uploaded. Nothing was lost.`,
  `**The Ordaining Council goes online a week before you,** so they can spend time with the new system before you arrive. **submissions are paused from noon on May 25 until 8 a.m. June 1 (Central).** You can still browse your requirements, read prior feedback, and use the new study companion (more on him below). You just can't submit new work during those six days. **Plan ahead: anything you want submitted before the pause needs to be in by Sunday May 24.**`,
  `**Signing in.** Enter your email at the portal, and we'll send you a one-time six-digit code to use on the next screen. No passwords to remember.`,
  `**Your dashboard** shows your progress through the seventeen requirements, grouped by type. From there you submit work, read feedback, and reach the training library.`,
  `**How to Videos:** Short training videos live on your dashboard — about seven minutes in total, easy to watch on a phone between meetings.`,
  `**Meet Pardington**! Our AI study companion. He's named in honour of George Palmer Pardington, an Alliance theologian and contemporary of A.B. Simpson. He's there to think with you about the readings and help you prepare for your oral examination. He won't write your papers or sermons. That work is yours.`,
  `**Your monthly mentor report** now lives in the portal too — easier to keep on rhythm, and just as private as before. That conversation belongs to you and your mentor alone, and the Council never sees it.`,
  `If anything is missing or feels off when you log in June 1, drop Michelle a note at the District Ministry Centre and she'll get it sorted.`,
]

export function renderOrdinandPrep(firstName: string): { subject: string; html: string } {
  const body = salutation(firstName) + ORDINAND_PREP_BODY.map(paragraph).join('') + signoff()
  return { subject: ORDINAND_PREP_SUBJECT, html: wrapEmail(body) }
}

// ── 3. Ordinand go-live — sent Monday, June 1, 8 a.m. Central ──────────────

const ORDINAND_GO_LIVE_SUBJECT = 'The portal is here'

const ORDINAND_GO_LIVE_OPENER =
  `As promised: the new CMD Ordination Portal is now live! Submissions are open. Your new space is waiting. Welcome.`

const ORDINAND_GO_LIVE_BLESSING: string[] = [
  `May the work that begins here today, and the work that has long been quietly underway, find its true ground in Christ.`,
  `May every paper, every sermon, every mentor conversation, every faithful piece of feedback offered, draw all of us — ordinand, mentor, and Council together — nearer to the One who calls and prepares.`,
  `May this portal be only a small thing — a tool — and the formation it serves be the larger thing. And may the Spirit, who began the good work in each of us, bring it to completion.`,
  `Grace and peace to you, in this season.`,
]

export function renderOrdinandGoLive(firstName: string): { subject: string; html: string } {
  const body =
    salutation(firstName) +
    paragraph(ORDINAND_GO_LIVE_OPENER) +
    blessingBlock(ORDINAND_GO_LIVE_BLESSING) +
    signoff()
  return { subject: ORDINAND_GO_LIVE_SUBJECT, html: wrapEmail(body) }
}

// ── Combined index for the preview route ───────────────────────────────────

export const LAUNCH_COMMS = {
  council_prep:      renderCouncilPrep,
  ordinand_prep:     renderOrdinandPrep,
  ordinand_go_live:  renderOrdinandGoLive,
} as const

export type LaunchCommsKey = keyof typeof LAUNCH_COMMS
