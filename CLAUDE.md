# CLAUDE.md — CMD Ordination Agent
*Project briefing for Claude Code. Last updated: March 21, 2026.*

---

## 1. Project Overview

A custom learning management system (LMS) built for the **Canadian Midwest District (CMD)** of the Christian and Missionary Alliance church. It manages the ordination process for pastoral candidates (called "ordinands").

- **Ordinands** submit written work and track their progress
- **Council members** review and grade submissions
- **Admins** manage users, cohorts, grader assignments, and send progress updates
- **Everyone** can access **Pardington** — the AI-powered theological study assistant (named character, not just a generic chatbot)

**Live site:** https://cmd-ordination-agent.vercel.app
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
- Council (non-admin) → `/dashboard/council`
- Ordinands (non-admin, non-council) → auto-redirected to `/dashboard/ordinand`
- Admin Console card hidden from non-admins

### ✅ Admin Console (`/dashboard/admin`)
- **Ordinands tab** — register new ordinands; auto-generates 17 requirements on registration
- **Council Members tab** — add/remove council members, grant admin
- **Cohorts tab** — create cohorts (year + season + sermon topic)

### ✅ Ordinand Detail Page — Admin view (`/dashboard/admin/candidates/[id]`)
- Edit profile: first name, last name, email, cohort reassignment
- Progress bar with complete/in-progress/revision counts
- Requirements list grouped by type (Book Reports, Papers, Sermons) sorted by `display_order`
- Assign/reassign council grader per requirement
- Grade modal: 5-level rating + feedback text + "Graded By" selector → saves grade + updates status
- **"↑ Upload" button** on each incomplete requirement — admin uploads a file on behalf of an ordinand (migration tool + admin-assist for technical difficulties)
  - Uploads file to Supabase Storage under the ordinand's folder path
  - Creates or updates a `submissions` record with `file_name` and `version`
  - Sets requirement status to `submitted`
  - Auto-opens the grade modal immediately after upload
- **"Graded By" dropdown** in grade modal — allows admin to attribute a grade to a specific council member (critical for Moodle migration: historical grades must be attributed correctly)
- **"Send Progress Email"** button generates a pre-filled `mailto:` link

### ✅ Ordinand Dashboard (`/dashboard/ordinand`)
- Shows all 17 requirements grouped and sorted by handbook order
- Overall progress bar (%, complete, in-progress, not-started)
- Quick cards: Process Guide, Study Agent, My Profile
- Blue banner explaining how to submit assignments
- Each requirement shows status badge + "Submit →" or "View →"

### ✅ Ordinand Profile Page (`/dashboard/ordinand/profile`)
- View: name, email, cohort, sermon topic
- Edit own name (admin contact note for email/cohort changes)

### ✅ Ordination Process Guide (`/dashboard/ordinand/process`)
- Static handbook reference: overview, cohort calendar, 17 assignments breakdown
- Mentorship details, oral interview info (eligibility, format, 4 outcomes)
- Link to Study Agent

### ✅ Requirement Submission Page (`/dashboard/ordinand/requirements/[id]`)
- Shows handbook instructions per type (book report / sermon / paper)
- For papers: shows questions to address in the paper, then a self-assessment form
- Self-assessment: for each criterion, ordinand rates their paper and provides evidence from it
- File upload (PDF/DOCX) to Supabase Storage bucket `submissions`
- Submit button → sets status to `submitted`, saves file URL + self-assessment data
- Shows council feedback when graded

### ✅ Pardington — AI Study Agent (`/dashboard/study`)
- Named AI character; always refer to as "Pardington" in code comments, UI copy, and conversation
- Chat UI with suggested theological questions
- "Help me prepare for my oral interview" button walks through Appendix A.5 questions
- Backend at `/api/study-agent/route.ts` — streaming Anthropic API (claude-haiku-4-5-20251001)
- System prompt includes full handbook, reading list, paper questions, interview questions
- Refuses to write papers or sermons for candidates
- Requires `ANTHROPIC_API_KEY` in Vercel environment variables

### ✅ Council Dashboard (`/dashboard/council`)
- Lists grading assignments for the logged-in council member
- Links to grading pages

### ✅ Council Grading Page (`/dashboard/council/grade/[assignmentId]`)
- Shows the submitted file and self-assessment (for papers)
- Grade modal: rating + feedback → saves to `grades` table, updates requirement status

---

## 4. Database Schema Quick Reference

**Profiles columns:** `id, full_name, first_name, last_name, email, cohort_id, roles (text[]), role (enum), cohort_year, mentor_name, created_at, updated_at`

**Cohorts columns:** `id, name, year, season, sermon_topic (enum), created_at, updated_at`

**Requirement templates columns:** `id, type (enum), topic (enum), book_category (enum), title, description, sermon_question_index, display_order, created_at`
⚠️ The column is `book_category` — NOT `category`. Using `category` in a Supabase query will silently return null.

**Ordinand requirements columns:** `id, ordinand_id, template_id, cohort_id, status (enum), created_at, updated_at`
⚠️ The FK column to `requirement_templates` is `template_id`. PostgREST join syntax: `requirement_templates(...)`.

**Submissions columns:** `id, ordinand_id, ordinand_requirement_id, file_url, file_name, version, self_assessment (jsonb), submitted_at`
⚠️ `file_name` and `version` are NOT NULL. Always include both in any INSERT to `submissions` or it will fail.

**Grading assignments columns:** `id, ordinand_requirement_id, council_member_id, assigned_by, assigned_at, reassigned_at, notes`
⚠️ `ordinand_requirement_id` has a UNIQUE constraint — only one grading assignment per requirement. Always check for an existing one before inserting.

**Grades columns:** `id, submission_id, grading_assignment_id, overall_rating, overall_comments, graded_by, graded_at, paper_assessment (jsonb)`
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
    admin/register-user/route.ts    ✅ Supabase Admin user creation + requirement generation

  dashboard/
    page.tsx                        ✅ Role-based router (auto-redirects ordinands)

    admin/
      page.tsx                      ✅ Admin console (3 tabs)
      candidates/[id]/page.tsx      ✅ Ordinand detail: edit profile, graders, grade, email,
                                       admin upload + grade attribution

    council/
      page.tsx                      ✅ Council grading queue
      grade/[assignmentId]/page.tsx ✅ Council grading detail page

    ordinand/
      page.tsx                      ✅ Ordinand dashboard (requirements list)
      profile/page.tsx              ✅ Ordinand profile view/edit
      process/page.tsx              ✅ Static ordination process guide
      requirements/[id]/page.tsx    ✅ Requirement detail + submission form

    study/
      page.tsx                      ✅ AI study agent chat UI

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
- **Admin upload** is the primary migration tool: admin uploads each ordinand's existing files from Moodle, then uses the "Graded By" selector to attribute grades to the correct council member
- **Joanna Smith** (joanna@rosewoodpark.ca) was the first live beta migration — completed March 21, 2026; 5/17 requirements complete from real Moodle data

---

## 7. What Is NOT Built Yet

- **Cohort calendar** — a table (`cohort_events`) for upcoming gathering dates; admin UI to add/edit events; ordinand-facing view on their dashboard
- **Council dashboard improvements** — currently basic; no bulk assignment view
- **Paper grading UI** — council can grade papers but can't see the self-assessment data displayed alongside the submission during grading (data is saved in `submissions.self_assessment` jsonb, just not rendered on the grading page yet)
- **File viewer in admin** — admin can see that a submission was made and can upload new files, but can't view/preview the actual file from the admin page

---

## 8. Known Gotchas & Hard-Won Lessons

1. **`category` vs `book_category`** — The column on `requirement_templates` is `book_category`. Using `category` in a Supabase select returns null silently and breaks the entire query.

2. **Grades must be nested inside submissions** — There is no FK from `ordinand_requirements` directly to `grades`. Always query as `submissions(id, file_url, grades(...))`, not `grades(...)` at the top level.

3. **Tailwind requires config files** — `tailwind.config.js` and `postcss.config.js` must both exist. Without them, Tailwind CSS is stripped during production builds and all className-based styling disappears. `autoprefixer` must also be in `devDependencies`.

4. **Supabase OTP type** — Use `type: 'email'` in `verifyOtp()`, not `type: 'magiclink'`. The project sends email OTP codes, not magic links.

5. **RLS on all new tables** — Every new table needs RLS policies following the same pattern as existing tables. Never skip RLS.

6. **No localStorage/sessionStorage** — Not supported reliably in this environment.

7. **Single-file components** — No separate CSS or JS files. Keep everything in one file per page.

8. **Admin pages use inline styles; ordinand/council pages use Tailwind** — Be consistent within each file.

9. **`submissions` NOT NULL columns** — `file_name` and `version` are NOT NULL. Any INSERT to `submissions` must include both. Missing either causes a silent failure (Supabase client returns null for the inserted row) that cascades into a null `submission_id` on the grade upsert.

10. **`grading_assignment_id` is NOT NULL in `grades`** — Before upserting a grade, always ensure a `grading_assignments` record exists for the requirement. If none exists, INSERT one first. Check for an existing assignment before inserting (UNIQUE constraint on `ordinand_requirement_id` will reject duplicates).

11. **Storage RLS has separate INSERT and UPDATE policies** — The `storage.objects` table requires separate policies for INSERT and UPDATE. The default ordinand policy only covers their own folder path. Admin upload required adding two explicit admin policies to `storage.objects` (not just the `submissions` table).

12. **React state batching with modals** — After `setSelectedReq(updatedReq)`, do NOT immediately call `fetchData()` (even with a `silent` flag). The async state updates race and can prevent the modal from rendering. Use optimistic local state updates (`setRequirements(prev => prev.map(...))`) instead of re-fetching when opening a modal immediately after an operation.

---

## 9. Working Style

- Git is available directly — commits and pushes happen from Claude Code, not from the GitHub web editor
- One logical change per commit
- All changes are pushed immediately after committing
- Plain language explanations after each change
- Never assume the user has coding knowledge — explain what was changed and why
