# CMD Ordination Portal

A custom Learning Management System (LMS) for the **Canadian Midwest District (CMD)** of the [Christian and Missionary Alliance](https://www.cmacan.org/) church, built to manage the pastoral ordination process from start to finish.

**Live site:** [ordination.canadianmidwest.ca](https://ordination.canadianmidwest.ca)

---

## What It Does

The ordination process for Alliance pastoral candidates (called *ordinands*) spans roughly three years and involves 17 graded requirements — book reports, theological papers, and preached sermons. This portal replaces the district's previous Moodle-based system with a purpose-built experience for the three groups of people involved:

| Role | What they do in the portal |
|------|---------------------------|
| **Ordinands** | Submit assignments, track progress, use the AI study assistant |
| **Council members** | Review and grade submitted work |
| **Admins** | Manage users, assign graders, track cohorts, send progress updates |

---

## Features

### For Ordinands
- Email OTP sign-in (no password required)
- Dashboard showing all 17 requirements with live status badges
- File upload for PDF/DOCX submissions with self-assessment forms for papers
- Cohort calendar showing upcoming gathering events with rich notes
- Ordination process guide with mentorship details and interview information
- **Pardington** — an AI-powered theological study assistant (named in honour of George Palmer Pardington, 1858–1925) that knows the full ordination handbook, reading list, and interview question bank; refuses to write papers or sermons for candidates

### For Council Members
- Dedicated grading queue sorted by urgency (critical 60+ days, overdue 30–60 days, pending)
- Paper grading with per-section rubric ratings
- Sermon grading with per-section comment fields across a 21-criterion rubric
- Direct link to submitted files

### For Admins
- Register new ordinands (auto-generates their 17 requirements)
- Manage council members including grader assignments and role grants
- Create and manage cohorts by year, season, and sermon topic
- Cohort calendar with multi-cohort event assignment and a rich notes editor
- Per-ordinand detail page: edit profile, reassign graders, upload files on behalf of ordinands (with historical date picker for Moodle migration), enter self-assessment data manually
- Grade attribution — "Graded By" selector allows historical grades to be attributed to the correct council member
- AI Interview Brief — on-demand, streams a structured 7-section pre-interview brief synthesising all grades, self-assessments, evaluation responses, and Pardington conversation history; downloadable as a branded PDF; emailable to council members
- **Oral Interview Console** — schedule interviews, conduct them in a split-panel view (AI brief + live notes), record council attendance, auto-save notes, record decisions with four handbook outcomes (sustained/conditional/deferred/not sustained), track ordination service details
- **Archive Report** — generates a comprehensive final report pulling completion grid, interview data, external evaluations, mentor reports, and AI executive summary; downloadable as branded PDF or TXT; emailable to council; saved as a permanent DB record
- Send progress emails to ordinands via Resend
- Archive ordinands as complete (preserved for records) or soft-delete them
- External evaluation forms for mentors and church board members — sent via tokenised email link, no portal account required

### Handbook Wiki
- Full multi-section ordination handbook built into the portal
- Public sections accessible without login (for district website integration)
- Portal sections gated behind authentication
- Role-based entry grid linking each stakeholder type to their relevant content

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | [Next.js 14](https://nextjs.org/) (App Router), all pages are `'use client'` components |
| Styling | [Tailwind CSS v3](https://tailwindcss.com/) |
| Database & Auth | [Supabase](https://supabase.com/) (Postgres + Auth + Storage) |
| Deployment | [Vercel](https://vercel.com/) |
| AI | [Anthropic API](https://www.anthropic.com/) — `claude-haiku-4-5-20251001` |
| Email | [Resend](https://resend.com/) |
| PDF generation | [jsPDF](https://parall.ax/products/jspdf) (client-side) |

---

## Getting Started

> **Note:** This project requires a live Supabase instance and several third-party API keys. There is no local database mock. All meaningful testing should be done against a real Supabase project.

### 1. Clone the repo

```bash
git clone https://github.com/revchrissmith-png/cmd-ordination-agent.git
cd cmd-ordination-agent
npm install
```

### 2. Set up Supabase

Create a new project at [supabase.com](https://supabase.com). You will need to create the following tables (with RLS enabled on all of them):

- `profiles` — user accounts with roles, cohort assignment, mentor info
- `cohorts` — year/season groupings with sermon topic
- `cohort_events` — calendar events with `cohort_ids uuid[]` array column
- `requirement_templates` — the 17 requirement definitions (type, title, display order)
- `ordinand_requirements` — per-ordinand requirement instances with status
- `submissions` — file uploads linked to requirements
- `grading_assignments` — council member ↔ requirement pairings
- `grades` — ratings and feedback, nested under submissions
- `evaluation_tokens` — UUID tokens for external evaluator forms
- `evaluations` — mentor and church board evaluation responses
- `pardington_logs` — AI conversation history per session

See `CLAUDE.md` in this repo for the full column-level schema reference including gotchas and constraint details.

### 3. Configure environment variables

Create a `.env.local` file (for local reference — actual secrets live in Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
RESEND_API_KEY=your_resend_api_key
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` is used server-side only (API routes) to update `auth.users` email addresses and read last sign-in timestamps. Never expose it to the browser.

### 4. Deploy to Vercel

Connect the repo to a Vercel project, add the environment variables above in the Vercel dashboard, and push to `main`. Vercel auto-deploys on every push.

```bash
git push origin main
```

---

## Project Structure

```
app/
  page.tsx                          Login page (email OTP)
  auth/callback/page.tsx            Auth callback handler
  components/
    ErrorBoundary.tsx               React error boundary for section isolation
    ModalWrapper.tsx                Accessible modal (focus trap, Escape, ARIA)
    Skeleton.tsx                    Skeleton loading primitives (Page, Card, Table)
    UploadProgress.tsx              Indeterminate upload progress indicator
    ViewAsUserModal.tsx             Shared admin "View as User" modal
    BetaBanner.tsx                  Portal-wide beta notification banner
  api/
    notify-grader/route.ts          Email grader when submission arrives
    notify-ordinand-graded/route.ts Email ordinand when grade is posted
    study-agent/route.ts            Pardington AI backend (streaming, auth-gated)
    feedback/route.ts               Bug/feature feedback submission
    council/complete-grade/route.ts Server-side grade finalisation
    admin/
      register-user/route.ts        User creation + requirement generation
      auto-assign-graders/route.ts  Algorithmic grader assignment
      interview-brief/route.ts      AI Interview Brief (streaming)
      email-interview-brief/route.ts Email brief to council via Resend
      interview-scores-aggregate/route.ts Anonymous aggregate scores for debrief
      notify-interview-scheduled/route.ts Email council when interview is scheduled
      interviews/route.ts           List + schedule oral interviews (GET/POST)
      interviews/[id]/route.ts      Get/update/delete interview (GET/PATCH/DELETE)
    council/
      interview-scores/route.ts     Council member score upsert + retrieval
      archive-report/route.ts       Save + email final reports (POST action=save|email)
      daily-report/route.ts         Vercel cron — daily activity digest email
      send-council-report/route.ts  Council progress report email via Resend
      send-evaluation-invite/route.ts  Tokenised external evaluator invitations
      update-user-email/route.ts    Service-role email update for council members
      council-member-info/route.ts  Last sign-in lookup
      delete-ordinand/route.ts      Cascade delete (grades, assignments, submissions, etc.)
      regenerate-requirements/route.ts  Recalculate cohort requirements on topic change
  dashboard/
    error.tsx                       Route-level error boundary (all /dashboard/*)
    page.tsx                        Role-based router
    admin/                          Admin console + ordinand/council detail pages
      interview/[id]/page.tsx       Interview Console (split-panel: brief + notes)
      interview/[id]/aggregate/     Chair's aggregate score view (dark theme, pop-out)
      candidates/[id]/_components/  Co-located modal subcomponents (Grade, SA, Eval, Brief, Interview)
    council/
      interview/[id]/page.tsx       Council live interview console (scoring, questions, brief)
      grade/[assignmentId]/         Grading detail with auto-save drafts
        _components/                SermonRubric, PaperAssessment
    ordinand/                       Dashboard, profile, requirements, process guide, mentor report
    study/                          Pardington chat interface
  eval/
    error.tsx                       Route-level error boundary (public eval form)
    [token]/page.tsx                Public external evaluation form (no auth)
  handbook/                         Wiki landing page, section viewer, content data
lib/
  api-auth.ts                       Shared API route authentication middleware
  config.ts                         Centralised config (URLs, email, org names)
  email-templates.ts                Branded email HTML builder (wrapEmail, emailButton)
  theme.ts                          Design tokens, types, status/rating configs
  formStyles.ts                     Shared Tailwind class strings for forms
hooks/
  useFlash.ts                       Flash message hook (success/error toasts)
utils/
  supabase/client.ts                Browser Supabase client (cookie-based sessions)
  fetchWithTimeout.ts               AbortController-based fetch with configurable timeout
  generateBriefPDF.ts               Interview brief PDF generation (jsPDF)
  generateArchiveReportPDF.ts       Archive/final report PDF generation (jsPDF)
  generateDecisionPDF.ts            Interview decision record PDF (jsPDF)
  interviewQuestions.ts             10-section CMD interview questions, ratings, scoring utilities
  markdown.ts                       Lightweight markdown-to-HTML renderer
  selfAssessmentQuestions.ts        Self-assessment question sets by theological topic
  sermonRubric.ts                   21-criterion sermon evaluation rubric
  logActivity.ts                    Client-side activity logging helper
supabase/
  migrations/                       SQL migrations (managed via Supabase CLI)
middleware.ts                       Edge middleware — refreshes auth cookies
```

---

## Key Design Decisions

**No self-registration.** Accounts are created by admins only (`shouldCreateUser: false` on OTP sign-in). This is intentional — the ordination process is invitation-based.

**Mentors are outside the system.** Mentors are referenced by name and email on ordinand profiles, but they do not have portal accounts. Mentor input is collected via a tokenised external evaluation form only. This preserves appropriate distance between the mentoring relationship and the formal assessment process.

**No local dev server against production data.** Supabase environment variables are stored in Vercel only. Run `npm run dev` to work on UI components in isolation, but all data-dependent features must be tested against the live Vercel deployment.

**Sessions are cookie-based.** The Edge middleware uses `@supabase/ssr`'s `createServerClient`, which reads sessions from cookies. Always use `createBrowserClient` from `@supabase/ssr` (not `createClient` from `@supabase/supabase-js`) so sessions are visible to the middleware.

---

## Development

### Database Migrations

Schema changes are managed with the [Supabase CLI](https://supabase.com/docs/guides/cli). The CLI is linked to the production project and the full migration history is tracked.

```bash
# Create a new migration
supabase migration new my_migration_name

# Edit the generated file in supabase/migrations/

# Push all pending migrations to the remote database
supabase db push
```

> **Important:** Never apply migrations by pasting SQL into the Supabase dashboard. Always use `supabase db push` so the migration history stays in sync between the CLI and the remote project. If a migration is applied outside the CLI, you will need to repair the history with `supabase migration repair --status applied <timestamp>`.

### Shared Architecture

The codebase uses a set of shared modules to avoid duplication. When building new features, use these rather than inlining equivalents:

| Module | What it provides |
|--------|-----------------|
| `lib/theme.ts` | Colour constants, `Rating`/`Status` types, status config objects, display labels |
| `lib/formStyles.ts` | Tailwind class strings: `inputClass`, `selectClass`, `textareaClass`, `btnPrimary`, `labelClass` |
| `lib/config.ts` | `SITE_URL`, `SITE_DOMAIN`, `EMAIL_FROM`, `ADMIN_EMAIL`, `ORG_NAME`, `BOOK_OPTIONS` |
| `lib/email-templates.ts` | `wrapEmail()` branded HTML wrapper, `emailButton()`, `emailInfoBlock()` |
| `lib/api-auth.ts` | `requireAuth(request)` — returns `{ user, supabase }` or a 401 response |
| `hooks/useFlash.ts` | `useFlash()` — `{ flash, showFlash }` for success/error toasts |
| `utils/fetchWithTimeout.ts` | `fetchWithTimeout(url, options, timeoutMs)` — AbortController-based fetch |
| `utils/markdown.ts` | `renderMarkdown(text)` — lightweight markdown-to-HTML for display |
| `app/components/Skeleton.tsx` | `PageSkeleton`, `CardSkeleton`, `TableSkeleton` — animated loading states |
| `app/components/ModalWrapper.tsx` | Accessible modal shell (focus trap, Escape, ARIA, backdrop, scroll lock) |
| `app/components/UploadProgress.tsx` | Indeterminate progress bar for file uploads |
| `app/components/ErrorBoundary.tsx` | React error boundary for isolating section crashes |

### Error Handling Conventions

- **API routes:** Wrap handler logic in try-catch; return sanitised JSON error messages (never expose stack traces or internal IDs).
- **Email sends:** Use `fetchWithTimeout` with a 15-second timeout on all Resend calls.
- **Client pages:** Wrap fetch calls in try-catch with user-visible error feedback via `useFlash`. Use `PageSkeleton` / `CardSkeleton` for loading states.
- **Route boundaries:** `error.tsx` files in `/dashboard` and `/eval` catch unhandled errors at the route level.
- **Section isolation:** Wrap risky UI sections in `<ErrorBoundary>` so a crash in one panel doesn't take down the whole page.

### Code Change Protocol

After any code change:

```bash
# 1. Verify the build compiles
npm run build

# 2. Commit with a descriptive message
git add <changed-files>
git commit -m "description of change"

# 3. Push so Vercel auto-deploys
git push origin main
```

Never leave uncommitted changes in the working tree. The build step is the pre-commit check — a change is not done until it is pushed.

---

## Adapting for Another District

This portal was built for the CMD but the architecture is generic enough to adapt for any denomination or credentialling body with a multi-year, multi-requirement ordination or licensing process. The main things you would need to customise:

- **Requirement templates** — the 17-requirement structure (10 book reports, 4 papers, 3 sermons) and the theological topic list are CMD-specific; these live in the database as seeded data
- **Handbook content** — all wiki content is in `app/handbook/content.ts` as a typed data structure; replace with your own handbook text
- **Pardington's system prompt** — lives in `app/api/study-agent/route.ts`; includes the full CMD handbook, reading list, and interview questions
- **Branding** — CMD dark blue (`#00426A`) and Alliance blue (`#0077C8`) colour constants appear at the top of each page file; the CMD logo is at `public/cmd-logo.png`
- **Email sending domain** — configured in Resend; update the `from` address in each API route that sends email

---

## Recent Changes

### 2026-05-26 — Semi-annual commitments + Lydia Stoesz brief fix

- **Lydia Stoesz interview brief truncation fix** (`17c66e0`): `app/api/admin/interview-brief/route.ts` was capped at `max_tokens: 4000` on Haiku 4.5, which truncated briefs mid-section for ordinands with full files. Bumped to 8000 tokens and switched the model to `claude-sonnet-4-6` (per original spec: Haiku for Pardington sessions, Sonnet for council-facing summaries).
- **Semi-annual commitments feature** (`d0b209d`, supersedes earlier `a8fd6dd`+`8a14f9e` target-date attempt): dropped the per-requirement `target_date` columns and added a `commitments` table (`ordinand_id`, `ordinand_requirement_id`, `cycle_start`, `target_date`, `committed_at`, UNIQUE on requirement+cycle). Cycles begin June 1 / December 1; epoch `2026-06-01`. Each cycle, ordinands hit a blocking modal that asks them to pick 3-4 outstanding requirements (or all remaining if ≤3) and propose a target submission date within the next six months. Snapshot model — no mid-cycle replacement. New "My Commitments — Jun 2026 → Nov 2026" dashboard section above the progress card; committed items get an inline date pill on their requirement row. Admin candidate list grew a green/yellow/red/grey health dot computed from each ordinand's current-cycle commitments.
- **Joanna Smith UAT preview** (`510661d` → rolled back in `7a5545c`): added an `EARLY_ACCESS_ORDINAND_IDS` set that lets named ordinands hit the modal before the epoch with `cycle_start` pinned to the upcoming cycle. Joanna previewed it the same day; her three test commitments were DELETEd and she's back to a clean slate. The hook stays in the code as an empty set for the next pre-launch preview.

### 2026-05-21 — Cohorts tab: ordinand roster per cohort + Silas Friesen requirements restored

- **Cohorts tab ordinand roster** (`62c2a69`): each cohort card on the Admin → Cohorts tab now lists assigned ordinands alphabetically below the topic cards. Each row links directly to the ordinand's admin profile page and shows a stage badge (Active / Completed). Cohorts with no assigned ordinands show no roster section. Closes tasks #172 and #173.
- **Silas Friesen requirements** (direct DB fix): 17 ordinand_requirements rows regenerated for Silas Friesen (Fall 2028, divine_healing track) after accidental deletion — 10 book reports, 4 papers, 3 sermons, all `not_started`.

### 2026-05-19 — Weekly digest email replaces daily activity report

- **Weekly digest** (`0884ad2`): new `/api/cron/weekly-digest` route fires every Monday at 7:00 AM Regina time. Five sections: submissions this week, assignments graded this week, users inactive 30+ days, submissions ungraded 60+ days (red alert), ordinands with no mentor report 60+ days (red alert). Email includes summary bar with action-needed / all-clear badge.
- **Daily report cron retired**: `vercel.json` updated from daily `/api/admin/daily-report` to weekly digest schedule (`0 13 * * 1`). Old route preserved as manual admin trigger.
- **Recipients wired up**: `DIGEST_CC_EMAIL=admin.assist@canadianmidwest.ca` (Michelle Stearns) set in Vercel production; Chris receives at `system.admin@canadianmidwest.ca`.

### 2026-05-17 — LIFECYCLE.md: locked post-launch development cadence

- **LIFECYCLE.md added** (`5052209`): documents the annual tick-tock maintenance cadence — **8–21 December** (bug-fix window) and **8–21 June** (feature-update window) — with the codebase frozen between windows. Includes the one-time **1–7 June 2026 stabilization tail**, the three-condition AND-gate cadence-break exception (blocks required workflow + reproducible + 14-day or 10%-cohort harm threshold), Michelle as sole feedback intake, and the protected class (ordinands + council members). To be presented to the Ordaining Council on 25 May 2026.

### 2026-05-13 — Scheduled launch sends + council notification re-enabled

- **Scheduled cron send** (`8265b5c`): real launch-send route at `/api/cron/send-launch-comm`. Single daily Vercel cron at `0 16 * * *` (16:00 UTC = 10:00 Regina, CST year-round) date-dispatches to the right audience: May 14 → council_prep (admin+council, 10 recipients), May 15 → ordinand_prep (admin+ordinand, 31 recipients), June 1 → ordinand_go_live (admin+ordinand, 31 recipients), any other day → 204 no-op. Uses 1 of Hobby's 2 cron slots. Auth: Vercel-managed `CRON_SECRET`. Admin `POST { key }` available as a manual recovery path. Throttled `sendMany` at 4/sec fits worst-case 31 recipients (~7.75 s) under Hobby's 10 s function limit.
- **Launch-comms copy edits** (`8265b5c`): Council Prep double-space fixed ("through  Monday" → "through Monday"); Ordinand Prep "submissions are paused" → "Submissions are paused"; "before you arrive" → "before submissions reopen" (resolved the "no access for 7 days" vs. "can still browse" ambiguity).
- **Council interview notifications re-enabled** (`d04e512`): `notify-interview-scheduled` call in `InterviewSection.tsx` had been commented out since 2026-04-22 (testing). Uncommented — all 9 council members now receive an email (date, candidate name, lead interviewer, council dashboard link) when an interview is scheduled. Submission notifications (`notify-grader`) were unaffected throughout.

### 2026-05-12 — Pardington conversation history on mobile

- **Mobile hide fix** (`71fc782`): yesterday's conversation-history sidebar (`f87eefc`) shipped with a `@media (max-width: 800px) { display: none }` guard in an inline `<style>` block, but the `<aside>` itself carried inline `style={{ display: 'flex', width: '360px' }}` — inline styles beat media queries, so the 360 px panel was crushing the chat column on every phone. Replaced the CSS-only guard with a JS `matchMedia('(max-width: 800px)')` viewport check; `isNarrowViewport` defaults to `true` so SSR and the mobile first paint agree (no hydration mismatch, no broken-layout flash).
- **Mobile slide-in drawer** (`26dad98`): launch comms (onboarding emails, training video library, orientation walkthrough) all promise ordinands they can reach prior conversations from the sidebar, so "hidden on mobile" wasn't a tenable v1. Added a ☰ button in the Pardington sub-header that opens a cobalt drawer (`min(360px, 85vw)`) sliding in from the left, carrying the same session list, gold "current session" accent, and "+ New conversation" affordance as the desktop sidebar. Tapping a session, starting a new conversation, or rotating an iPad portrait→landscape all auto-dismiss the drawer. Sidebar contents extracted into a shared JSX fragment so the desktop `<aside>` and the mobile drawer can't drift.

### 2026-05-11 — Launch prep: submission pause, launch-comms previews, dashboard cleanup

- **Submission pause feature** (`867becc`): new `submission_windows` table + `is_submission_paused()` SQL function + **RESTRICTIVE** RLS policy on `submissions.INSERT` that blocks non-admin inserts during an active window. Admin inserts pass through for backfill / recovery. Council quiet-week seeded for `2026-05-25 12:00 → 2026-06-01 08:00 America/Regina` (CST year-round, no DST math). Client: `SubmissionPauseBanner` + `useSubmissionPause` hook (60 s poll) mounted on the ordinand dashboard and every requirement detail page; Submit/Resubmit buttons gate on `submissionsPaused` with tooltip + inline notice. Mentor reports, Pardington, and read access intentionally untouched. Migration at `supabase/migrations/20260511000000_add_submission_windows.sql`.
- **Launch-comms preview pipeline** (`cabe723`): `/api/admin/preview-launch-comms` sends all three launch emails (Council Prep · Ordinand Prep · Ordinand Go-Live) personalised to every admin profile with a `[PREVIEW]` subject prefix. From-display "Chris Smith" over `noreply@send.canadianmidwest.ca` (chris@ not verified on the Resend domain); reply-to `chris@canadianmidwest.ca`. Trigger UI at `/dashboard/admin/launch-comms`, linked from the Admin Console header. Render pipeline reuses the existing `wrapEmail()` template — visual identity matches in-flight transactional emails. Copy is held as TS constants in `lib/launch-comms.ts`; edit + push + retrigger to iterate.
- **Dashboard quick-access cards** (`e32cac5`): five-card row was wrapping to two rows after Training Videos joined; switched `lg:grid-cols-4` → `lg:grid-cols-5`, tightened padding, trimmed arrow cards to two text lines. Mobile layouts unchanged.
- **Resend rate-limit throttle** (`46828ba`): preview send hit Resend's 5/sec ceiling when the 6th of 6 emails 429'd. New `lib/resend-send.ts` (`sendOne` with `Retry-After`-aware 429 retry, `sendMany` array fan-out throttled to ~4/sec). Preview route refactored to build one queue and pass it through `sendMany()`. Forward-compatible with the real launch sends to ~50 ordinands+council on May 14/15/Jun 1.
- **Round 2 launch-comms manuscript edits** (`7df2ec6`): synced Chris's revisions to all three emails from the markdown drafts into `lib/launch-comms.ts`. Council prep adopts collective voice and "exclusive access" framing; ordinand prep tightens the council paragraph and reframes the training-videos callout as "How to Videos"; go-live opener becomes "is now live!" + "Your new space is waiting". Blessing block unchanged.

### 2026-05-06 — Jordan's email moved to a real-deliverable address (clip 02 unblock)

- **`jordan.smith@cmd-demo.local` → `jordan.smith@canadianmidwest.ca`**: Supabase Auth rejects `.local` domains in `signInWithOtp`, blocking clip 02's recording flow (which teaches the OTP screens). Switched Jordan to a real-deliverable address (M365 alias on `canadianmidwest.ca` routing to Chris) so the OTP path works end-to-end on camera. Casey (mentor) and Alex Bennett (demo grader) keep their `.local` emails — they never authenticate.
- **Filter discipline now uses `is_demo` everywhere, never email-suffix**: `app/api/admin/daily-report/route.ts` looked up `feedback_reports.user_email.endsWith('@cmd-demo.local')`; replaced with a join through `profiles.is_demo`. `scripts/demo-login-link.mjs` gated on the `.local` suffix; replaced with a `profiles.is_demo` lookup against the Supabase REST API.
- **Seed updated**: `supabase/demo-seed/jordan-smith.sql` now seeds the new email so re-runs stay aligned.

### 2026-04-27 — Demo data infrastructure for training-video recording

- **`is_demo` flag on `profiles`**: new boolean column (default false, indexed) used to filter demo/recording accounts out of every admin-facing list, count, queue, and outbound email path. Replaces what would otherwise be a fragile `email LIKE '%@cmd-demo.local'` pattern repeated everywhere.
- **Filter discipline applied across 7 leak points**: `app/dashboard/admin/page.tsx` (council/candidates/activity), `app/dashboard/admin/candidates/[id]/page.tsx` (council picker), `app/dashboard/council/page.tsx` (upcoming interviews), `app/api/admin/auto-assign-graders/route.ts` (grader pool), `app/api/admin/daily-report/route.ts` (cron-emailed digest), `app/api/admin/send-evaluation-invite/route.ts` (email guard), `app/api/notify-ordinand-graded/route.ts` (email guard). Invariant: a demo ordinand can only be matched with a demo grader, never a real one — and vice versa.
- **`supabase/demo-seed/jordan-smith.sql`**: idempotent one-shot seed for the Jordan Smith demo ordinand (Spring 2027 cohort, mentor Pastor Casey Reeve) plus fictional council grader Pastor Alex Bennett. Seeds 17 requirement cards in the spec'd state mix (1 graded with pastoral feedback, 1 awaiting, 1 returned-for-revision, 1 paper draft in progress, 1 sermon submitted with video URL, balance not_started), 3 Spring 2027 cohort events, 1 mentor report, and 2 prior Pardington conversations. All rows tagged with stable UUIDs so re-runs upsert.
- **`scripts/demo-login-link.mjs`**: mints single-use magic-link URLs for `*@cmd-demo.local` accounts via the Supabase admin `generate_link` API. Real OTP delivery to `.local` addresses bounces, so this is the supported sign-in path for demo accounts. The script warns clearly when the project's redirect URL allowlist needs updating.

### 2026-04-22 (evening)
- **Archive report PDF fix**: Unicode bullet characters (✓, ○) broke jsPDF font metrics causing stretched letter-spacing on every requirement line — replaced with colored dot indicators
- **Cohort display fix**: archive report showed "undefined undefined Cohort" because admin page query omitted season/year fields from cohorts join

---

## Acknowledgements

Built for the Canadian Midwest District of the Christian and Missionary Alliance.

*Pardington is named in honour of [George Palmer Pardington](https://en.wikipedia.org/wiki/George_Palmer_Pardington) (1858–1925), Alliance theologian and close colleague of A.B. Simpson.*
