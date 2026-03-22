# CLAUDE.md — CMD Ordination Agent
*Project briefing for Claude Code. Last updated: March 21, 2026 · v0.3.0*

---

## 1. Project Overview

A custom learning management system (LMS) built for the **Canadian Midwest District (CMD)** of the Christian and Missionary Alliance church. It manages the ordination process for pastoral candidates (called "ordinands").

- **Ordinands** submit written work and track their progress
- **Council members** review and grade submissions
- **Admins** manage users, cohorts, grader assignments, and send progress updates
- **Everyone** can access **Pardington** — the AI-powered theological study assistant (named character, not just a generic chatbot)

**Live site:** https://ordination.canadianmidwest.ca (custom subdomain; Vercel deployment at cmd-ordination-agent.vercel.app is the underlying host)
**GitHub repo:** github.com/revchrissmith-png/cmd-ordination-agent
**Supabase project ID:** `gdjodcqlydmtlccjuurw` (AWS ca-central-1)

---

## 2. Tech Stack & Architecture

| Layer | Tool |
|-------|------|
| Frontend | Next.js 14 (App Router), all pages are `'use client'` components |
| Styling | Tailwind CSS v3 — requires `tailwind.config.js` and `postcss.config.js` (both present) |
| Database & auth | Supabase (Postgres + Supabase Auth + Storage) |
| Deployment | Vercel (auto-deploys on push to `main`) |
| AI | Anthropic API — model: `claude-haiku-4-5-20251001` |
| Email | Resend — sending domain `send.canadianmidwest.ca`, from address `noreply@send.canadianmidwest.ca` |

**Key config files that must exist:**
- `tailwind.config.js` — content paths for CSS class scanning
- `postcss.config.js` — runs Tailwind + Autoprefixer during build
- Both are committed and working. Do NOT delete them.

---

## 3. What Has Been Built (Current State)

### ✅ Login page (`/`)
- Email OTP sign-in (Supabase sends a 6-digit code by email)
- `shouldCreateUser: false` — blocks self-registration
- `onAuthStateChange` listener auto-redirects on successful sign-in
- "Contact the District Office" note for users without access
- Auth callback handler at `/auth/callback/page.tsx`

### ✅ Dashboard router (`/dashboard/page.tsx`)
- Reads user role from `profiles.roles` array
- Admins → `/dashboard/admin`
- Council (non-admin) → `/dashboard/council` (direct redirect, bypasses hub)
- Ordinands (non-admin, non-council) → `/dashboard/ordinand` (direct redirect)
- Admin Console card hidden from non-admins

### ✅ Admin Console (`/dashboard/admin`)
- **Ordinands tab** — register new ordinands; auto-generates 17 requirements on registration; archive/complete flow (see below)
- **Council Members tab** — add/remove council members, grant admin; "Manage →" link per member to council manage page
- **Cohorts tab** — create cohorts (year + season + sermon topic)
- **Calendar tab** — create/edit/delete cohort gathering events with rich notes editor (bold, italic, links, bullet lists); multi-cohort assignment (select one, several, or all cohorts per event); linked assignment picker

### ✅ Ordinand Archive/Complete Flow (admin)
- Delete button on each ordinand row opens a two-step modal
- Step 1: choose **Delete** (soft-remove, `status='deleted'`, hidden from all views) or **Mark Complete** (`status='completed'`, preserved for records)
- Step 2: optional archive report — assignment completion summary is functional; AI summary, interview report, and ordination service sections show "Coming Soon" badge (pathway in place for a future build)
- Completed ordinands appear in a collapsible greyed-out section below the active list

### ✅ Ordinand Detail Page — Admin view (`/dashboard/admin/candidates/[id]`)
- Edit profile: first name, last name, email, cohort reassignment
- Progress bar with complete/in-progress/revision counts
- Requirements list grouped by type (Book Reports, Papers, Sermons) sorted by `display_order`
- Assign/reassign council grader per requirement
- Grade modal: 5-level rating + feedback text + "Graded By" selector → saves grade + updates status
- **"↑ Upload" button** on each incomplete requirement — admin uploads a file on behalf of an ordinand (migration tool + admin-assist for technical difficulties)
  - Includes a **submission date picker** (defaults to today, capped at today) so historical Moodle dates can be recorded accurately
  - Uploads file to Supabase Storage under the ordinand's folder path
  - Creates or updates a `submissions` record with `file_name`, `version`, and `submitted_at`
  - Sets requirement status to `submitted`
  - Auto-opens the grade modal immediately after upload
- **"Graded By" dropdown** in grade modal — allows admin to attribute a grade to a specific council member (critical for Moodle migration: historical grades must be attributed correctly)
- **"Send Progress Email"** button opens a modal with a pre-composed HTML email; primary action sends via Resend API; "Copy HTML" fallback also available

### ✅ Council Member Manage Page (`/dashboard/admin/council/[id]`)
- Editable profile (name, email)
- Last sign-in timestamp (fetched via service-role API)
- Grading stats: critical (60+ days), overdue (30–60 days), pending, complete counts
- Full assignment table showing all assigned ordinands and statuses
- HTML report email — preview in-page, send via Resend, or copy to clipboard

### ✅ Ordinand Dashboard (`/dashboard/ordinand`)
- Shows all 17 requirements grouped and sorted by handbook order
- Overall progress bar (%, complete, in-progress, not-started)
- Quick cards: Process Guide, Study Agent, My Profile, **Handbook** (4-column grid)
- Cohort calendar: upcoming gatherings filtered to the ordinand's cohort with rich notes rendered as formatted HTML (bold, italic, links, bullet lists)
- Blue banner explaining how to submit assignments
- Each requirement shows status badge + "Submit →" or "View →"

### ✅ Ordinand Profile Page (`/dashboard/ordinand/profile`)
- View: name, email, cohort, sermon topic
- Edit own name (admin contact note for email/cohort changes)

### ✅ Ordination Process Guide (`/dashboard/ordinand/process`)
- Live cohort calendar filtered to the ordinand's cohort (uses `cohort_ids.cs.{}` array containment)
- Overview stats: complete / in-progress / not-started
- Mentorship details, oral interview info (eligibility, format, 4 outcomes)
- Link to Study Agent; link back to dashboard for requirements

### ✅ Requirement Submission Page (`/dashboard/ordinand/requirements/[id]`)
- Shows handbook instructions per type (book report / sermon / paper)
- For papers: shows questions to address in the paper, then a self-assessment form
- Self-assessment: for each criterion, ordinand rates their paper and provides evidence from it
- File upload (PDF/DOCX) to Supabase Storage bucket `submissions`
- Submit button → sets status to `submitted`, saves file URL + self-assessment data
- Shows council feedback when graded

### ✅ Pardington — AI Study Agent (`/dashboard/study`)
- Named AI character; always refer to as "Pardington" in code comments, UI copy, and conversation
- Named in honour of George Palmer Pardington (1858–1925), Alliance theologian and close colleague of A.B. Simpson
- Chat UI with suggested theological questions
- "Help me prepare for my oral interview" button walks through Appendix A.5 questions
- Backend at `/api/study-agent/route.ts` — streaming Anthropic API (claude-haiku-4-5-20251001)
- System prompt includes full handbook, reading list, paper questions, interview questions
- Refuses to write papers or sermons for candidates
- Requires `ANTHROPIC_API_KEY` in Vercel environment variables

### ✅ Council Dashboard (`/dashboard/council`)
- Council-only users auto-redirect here on login (bypass the hub entirely)
- Lists all grading assignments for the logged-in council member
- Tabs: Needs Review / All Assigned / Complete with counts
- Overdue (30+ days) and critical (60+ days) urgency alerts and card highlighting
- Header includes Handbook link and Pardington link

### ✅ Council Grading Page (`/dashboard/council/grade/[assignmentId]`)
- Shows the submitted file and self-assessment (for papers)
- Paper grading: optional per-section rating (5-level scale) above each feedback textarea; saved in `paper_assessment.section_ratings`
- Sermon grading: optional comment field at end of each of 6 rubric sections; saved in `grades.sermon_section_comments`
- Grade modal: rating + feedback → saves to `grades` table, updates requirement status

### ✅ Handbook Wiki (`/handbook`)
- Full multi-page wiki accessible to all authenticated users
- Landing page (`/handbook`): role-based entry grid (Ordinand, Mentor, Church Leader, Council Member) with pill links to relevant sections; full section index below
- Section pages (`/handbook/[section]`): persistent left sidebar on desktop; mobile "☰ All Sections" overlay; in-section anchor navigation pills; Prev/Next section navigation
- 8 sections: Introduction, Key Stakeholders, The Ordinand's Journey, Assignment Requirements, Mentorship, Interview & Ordination, Council Responsibilities, Appendices & Resources
- Content stored in `app/handbook/content.ts` as a typed data structure (`ContentBlock` union: `p | ul | callout | outcomes`)
- Linked from: ordinand dashboard quick cards, council header, process guide

---

## 4. Database Schema Quick Reference

**Profiles columns:** `id, full_name, first_name, last_name, email, cohort_id, roles (text[]), role (enum), cohort_year, mentor_name, status, status_changed_at, created_at, updated_at`
⚠️ `status` column: `null` = active, `'deleted'` = soft-deleted, `'completed'` = archived. Filter active ordinands with `.is('status', null)`.

**Cohorts columns:** `id, name, year, season, sermon_topic (enum), created_at, updated_at`

**Cohort events columns:** `id, title, event_date, event_type, location, notes, cohort_ids (uuid[]), linked_template_id, created_at, updated_at`
⚠️ `cohort_ids` is a UUID array. Use `cohort_ids.cs.{"<uuid>"}` (contains) not `cohort_id.eq.<uuid>` (equality) when filtering for a specific cohort. A null `cohort_ids` means the event applies to all cohorts.

**Requirement templates columns:** `id, type (enum), topic (enum), book_category (enum), title, description, sermon_question_index, display_order, created_at`
⚠️ The column is `book_category` — NOT `category`. Using `category` in a Supabase query will silently return null.

**Ordinand requirements columns:** `id, ordinand_id, template_id, cohort_id, status (enum), created_at, updated_at`
⚠️ The FK column to `requirement_templates` is `template_id`. PostgREST join syntax: `requirement_templates(...)`.

**Submissions columns:** `id, ordinand_id, ordinand_requirement_id, file_url, file_name, version, self_assessment (jsonb), submitted_at`
⚠️ `file_name` and `version` are NOT NULL. Always include both in any INSERT to `submissions` or it will fail.

**Grading assignments columns:** `id, ordinand_requirement_id, council_member_id, assigned_by, assigned_at, reassigned_at, notes`
⚠️ `ordinand_requirement_id` has a UNIQUE constraint — only one grading assignment per requirement. Always check for an existing one before inserting.

**Evaluation tokens columns:** `id, token (uuid, unique), ordinand_id, eval_type ('mentor'|'church'), evaluator_name, evaluator_email, status ('pending'|'submitted'), submitted_at, created_by, created_at`
⚠️ `token` is a separate UUID from `id` — it's the public-facing value in the URL. Query by `token` (not `id`) from the public form page.

**Evaluations columns:** `id, token_id, ordinand_id, eval_type, evaluator_name, q1_call, q2_strengths, q3_development, q4_ratings (jsonb), q5a_spiritual_growth, q5b_emotional_stability, q5c_family_relationship, q6_moral_concern, q7_fruitfulness, q8_recommendation (boolean), q8_explanation, additional_comments, ministry_start_date (church only), board_member_position (church only), created_at`

**Grades columns:** `id, submission_id, grading_assignment_id, overall_rating, overall_comments, graded_by, graded_at, paper_assessment (jsonb), sermon_section_comments (jsonb)`
⚠️ Grades have NO direct FK to `ordinand_requirements`. The chain is:
`ordinand_requirements → submissions → grades`
In Supabase queries, nest grades inside submissions: `submissions(id, file_url, grades(...))`
Do NOT put grades at the same level as submissions — the query will fail silently.
⚠️ `grading_assignment_id` is NOT NULL — always ensure a `grading_assignments` record exists before upserting a grade.
⚠️ `submission_id` has a UNIQUE constraint — upsert grades using `onConflict: 'submission_id'`.

**Rating scale:** `insufficient` → `adequate` → `good` → `excellent` → `exceptional`
**Status flow:** `not_started` → `submitted` → `under_review` → `revision_required` or `complete`

**Supabase Storage:** Bucket `submissions` (public, 20MB max, PDF/DOCX/DOC only)
File path pattern: `submissions/{ordinand_user_id}/{requirement_id}-{timestamp}.{ext}`
Admin upload RLS: Two extra storage policies exist — "Admins upload any submission" (INSERT) and "Admins update any submission" (UPDATE) — checking `profiles.roles @> ARRAY['admin']`. Ordinand policy only allows uploads to their own folder path.

**The 5 theological topics:** `christ_centred`, `spirit_empowered`, `mission_focused`, `scripture`, `divine_healing`

**The 17 requirements per ordinand:**
- 10 book reports (all categories regardless of cohort)
- 4 papers (whichever 4 of the 5 topics are NOT the cohort's sermon topic)
- 3 sermons (on the cohort's designated sermon topic)

---

## 5. Key Files Reference

```
app/
  page.tsx                          ✅ Login page (OTP code flow)
  auth/callback/page.tsx            ✅ Magic link / session callback handler
  layout.tsx                        ✅ Root layout (imports globals.css)
  globals.css                       ✅ @tailwind directives

  api/
    study-agent/route.ts            ✅ Streaming Anthropic API backend
    admin/
      register-user/route.ts        ✅ Supabase Admin user creation + requirement generation
      send-council-report/route.ts  ✅ Resend API — sends council member report email

  dashboard/
    page.tsx                        ✅ Role-based router (auto-redirects council + ordinands)

    admin/
      page.tsx                      ✅ Admin console (Ordinands / Council / Cohorts / Calendar tabs)
      candidates/[id]/page.tsx      ✅ Ordinand detail: edit profile, graders, grade, email,
                                       admin upload (with date picker) + grade attribution,
                                       archive/complete flow
      council/[id]/page.tsx         ✅ Council member manage: profile, stats, full assignment
                                       table, report email via Resend

    council/
      page.tsx                      ✅ Council grading queue (auto-redirect on login)
      grade/[assignmentId]/page.tsx ✅ Council grading detail: paper section ratings,
                                       sermon section comments

    ordinand/
      page.tsx                      ✅ Ordinand dashboard (requirements + calendar + 4 quick cards)
      profile/page.tsx              ✅ Ordinand profile view/edit
      process/page.tsx              ✅ Ordination process guide (live calendar, interview info)
      requirements/[id]/page.tsx    ✅ Requirement detail + submission form

    study/
      page.tsx                      ✅ Pardington AI study agent chat UI

  eval/
    [token]/page.tsx                ✅ Public evaluation form (mentor & church board) — no auth required

  handbook/
    page.tsx                        ✅ Handbook wiki landing page (role-based entry + section index)
    content.ts                      ✅ All wiki content as typed data (8 sections, 42+ subsections)
    [section]/page.tsx              ✅ Dynamic section viewer (sidebar, anchors, prev/next)

utils/
  supabase/client.ts                ✅ Supabase browser client
  selfAssessmentQuestions.ts        ✅ Self-assessment question sets (5 topics)

tailwind.config.js                  ✅ Content paths for CSS class scanning
postcss.config.js                   ✅ Tailwind + Autoprefixer pipeline
package.json                        ✅ Dependencies (tailwindcss, autoprefixer, @anthropic-ai/sdk)
```

---

## 6. Migration Context (as of March 21, 2026)

The portal is in active beta migration from Moodle (the previous LMS used during alpha).

- **21 ordinands** are being migrated to the portal now (Spring 2026 and Fall 2026 cohorts)
- **9 ordinands** remain in Moodle until their Moodle subscription renews (Spring 2027 / Fall 2027 cohorts) — running dual systems temporarily is unavoidable given the 3-year ordination process
- **Admin upload** is the primary migration tool: admin uploads each ordinand's existing files from Moodle, sets the original submission date, then uses the "Graded By" selector to attribute grades to the correct council member
- **Joanna Smith** (joanna@rosewoodpark.ca) was the first live beta migration — completed March 21, 2026; 5/17 requirements complete from real Moodle data

---

## 7. What Is NOT Built Yet

Items are grouped by release phase as defined in the Alpha Report slide deck (March 2026).

### ✅ External Evaluation Forms (Mentor & Church Board) — built March 2026

- Secure token-based forms at `/eval/[token]` — no portal login required for evaluators
- Admin generates a unique link per type (mentor / church board) from the ordinand's detail page
- Link is a UUID token: `ordination.canadianmidwest.ca/eval/[token]` — unguessable, single-use
- Form pre-fills ordinand name; evaluator sees CMD branding but no portal nav or auth wall
- 8 questions matching the paper forms + 13-category rating grid using the 5-point scale with explanation block
- Church board form adds: date ministry commenced, board member position
- On submission: data saved to `evaluations` table, token marked submitted (cannot resubmit)
- Admin sees live status (Pending / Submitted) on ordinand detail page with Copy Link or View Response
- Database: `evaluation_tokens` and `evaluations` tables with RLS — anon can read token by UUID and insert; admins manage all
- Sent once, near the end of the ordinand's journey before the oral interview

### Near-term UX gaps (no phase gate — build as needed)

- **File viewer in admin** — admin can see that a submission was made and can upload new files, but can't open/preview the actual document from the admin candidate page
- **Archive report — AI/interview/ordination components** — the assignment completion summary section works; the AI summary, oral interview report, and ordination service sections are scaffolded with "Coming Soon" badges for a future build

### Beta phase (security hardening + SSO)

- **Auth check on Study Agent API** — `/api/study-agent/route.ts` currently has no server-side auth verification; any request with a valid format can call it. Needs `supabase.auth.getUser()` check at the top of the route handler
- **Rate limiting on all API routes** — `/api/study-agent`, `/api/admin/register-user`, `/api/admin/send-council-report` have no rate limiting; needs middleware or Vercel edge config
- **HTTP security headers** — CSP, X-Frame-Options, and related headers not yet configured; add via `next.config.js` headers()
- **Message array size cap in Study Agent** — no limit on how many messages can accumulate in a session; a very long conversation could send excessive tokens. Add a rolling window cap (e.g. last 20 messages)
- **Tighter RLS for profile data** — current RLS allows council members to read all profiles; scope reads to only what each role needs
- **"Sign in with Microsoft" SSO** — for churches on Microsoft 365; Supabase supports Azure AD provider. OTP email code remains as fallback
- **"Sign in with Google" SSO** — for churches on Google Workspace; Supabase supports Google provider. OTP email code remains as fallback
- All three auth methods (OTP, Microsoft, Google) displayed on the login page simultaneously

### v1.0 Feature: AI Interview Brief

The headline v1.0 feature — before each oral interview, the system synthesizes the ordinand's complete ordination journey into a council-ready briefing document, replacing hours of manual pre-interview preparation.

**What the brief includes:**
- Acknowledged strengths drawn from grades and written feedback
- Growth areas from constructive feedback and revision history
- Self-assessment gap analysis (where ordinand rated themselves vs. how council graded)
- Study agent struggle patterns (topics the ordinand returned to repeatedly)
- Suggested interview probe areas based on the above

**Data sources the AI pulls from:**
- All 17 grades and rubric ratings
- All council written feedback
- All ordinand self-assessment text (papers)
- Study agent conversation history
- Future: mentor evaluations and board assessments

**Delivery:** Generated on-demand from the ordinand's admin detail page; output as a formatted in-page report (and eventually downloadable PDF)

### Longer-term / exploratory

- **Board evaluation integration** — local church board evaluations referenced in the ordination process have no digital collection mechanism yet

**Design note — mentors are intentionally outside the system.** Mentors are referenced in the handbook and on the ordinand dashboard (name/email display), but they do not have portal access and this is by design. The CMD wants distance between the mentoring relationship and the formal assessment process. Do not build a mentor login, report submission, or evaluation flow.

---

## 8. Known Gotchas & Hard-Won Lessons

1. **`category` vs `book_category`** — The column on `requirement_templates` is `book_category`. Using `category` in a Supabase select returns null silently and breaks the entire query.

2. **Grades must be nested inside submissions** — There is no FK from `ordinand_requirements` directly to `grades`. Always query as `submissions(id, file_url, grades(...))`, not `grades(...)` at the top level.

3. **Tailwind requires config files** — `tailwind.config.js` and `postcss.config.js` must both exist. Without them, Tailwind CSS is stripped during production builds and all className-based styling disappears. `autoprefixer` must also be in `devDependencies`.

4. **Supabase OTP type** — Use `type: 'email'` in `verifyOtp()`, not `type: 'magiclink'`. The project sends email OTP codes, not magic links.

5. **RLS on all new tables** — Every new table needs RLS policies following the same pattern as existing tables. Never skip RLS.

6. **No localStorage/sessionStorage** — Not supported reliably in this environment.

7. **Single-file components** — No separate CSS or JS files. Keep everything in one file per page.

8. **Admin pages use inline styles; ordinand/council/handbook pages use Tailwind** — Be consistent within each file.

9. **`submissions` NOT NULL columns** — `file_name` and `version` are NOT NULL. Any INSERT to `submissions` must include both. Missing either causes a silent failure (Supabase client returns null for the inserted row) that cascades into a null `submission_id` on the grade upsert.

10. **`grading_assignment_id` is NOT NULL in `grades`** — Before upserting a grade, always ensure a `grading_assignments` record exists for the requirement. If none exists, INSERT one first. Check for an existing assignment before inserting (UNIQUE constraint on `ordinand_requirement_id` will reject duplicates).

11. **Storage RLS has separate INSERT and UPDATE policies** — The `storage.objects` table requires separate policies for INSERT and UPDATE. The default ordinand policy only covers their own folder path. Admin upload required adding two explicit admin policies to `storage.objects` (not just the `submissions` table).

12. **React state batching with modals** — After `setSelectedReq(updatedReq)`, do NOT immediately call `fetchData()` (even with a `silent` flag). The async state updates race and can prevent the modal from rendering. Use optimistic local state updates (`setRequirements(prev => prev.map(...))`) instead of re-fetching when opening a modal immediately after an operation.

13. **`cohort_ids` is an array column** — The `cohort_events` table stores cohort assignments as a `uuid[]` array. Use Supabase PostgREST array containment syntax: `.or('cohort_ids.cs.{"<uuid>"},cohort_ids.is.null')` — not `.eq('cohort_id', uuid)`. The latter silently returns no results.

14. **Unused variables cause build failures in production** — TypeScript strict mode treats unused `const` declarations as compile errors (not just warnings). This kills the CSS as well as the JS — the page renders unstyled. Always remove variables that are declared but no longer referenced after refactoring.

15. **`useParams()` can return null in Next.js 14** — The TypeScript type for `useParams()` includes `null`. Always null-check before accessing properties: `params && typeof params.section === 'string' ? params.section : ''`. Skipping this causes a production build failure.

---

## 9. Working Style

- Git is available directly — commits and pushes happen from Claude Code, not from the GitHub web editor
- One logical change per commit
- All changes are pushed immediately after committing
- Plain language explanations after each change
- Never assume the user has coding knowledge — explain what was changed and why
