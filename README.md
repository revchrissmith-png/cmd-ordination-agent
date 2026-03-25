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
- AI Interview Brief — on-demand, streams a structured 7-section pre-interview brief synthesising all grades, self-assessments, evaluation responses, and Pardington conversation history; downloadable as a branded PDF
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
  api/
    study-agent/route.ts            Pardington AI backend (streaming, auth-gated)
    admin/
      register-user/route.ts        User creation + requirement generation
      interview-brief/route.ts      AI Interview Brief (streaming)
      send-council-report/route.ts  Council report email via Resend
      send-evaluation-invite/route.ts  Tokenised external evaluator invitations
      update-user-email/route.ts    Service-role email update for council members
      council-member-info/route.ts  Last sign-in lookup
  dashboard/
    page.tsx                        Role-based router
    admin/                          Admin console + ordinand/council detail pages
    council/                        Council grading queue + grading detail
    ordinand/                       Ordinand dashboard, profile, requirements, process guide
    study/                          Pardington chat interface
  eval/[token]/page.tsx             Public external evaluation form (no auth)
  handbook/                         Wiki landing page, section viewer, content data
utils/
  supabase/client.ts                Browser Supabase client (cookie-based sessions)
  selfAssessmentQuestions.ts        Self-assessment question sets by theological topic
  sermonRubric.ts                   21-criterion sermon evaluation rubric
middleware.ts                       Edge middleware — refreshes auth cookies
```

---

## Key Design Decisions

**No self-registration.** Accounts are created by admins only (`shouldCreateUser: false` on OTP sign-in). This is intentional — the ordination process is invitation-based.

**Mentors are outside the system.** Mentors are referenced by name and email on ordinand profiles, but they do not have portal accounts. Mentor input is collected via a tokenised external evaluation form only. This preserves appropriate distance between the mentoring relationship and the formal assessment process.

**No local dev server against production data.** Supabase environment variables are stored in Vercel only. Run `npm run dev` to work on UI components in isolation, but all data-dependent features must be tested against the live Vercel deployment.

**Sessions are cookie-based.** The Edge middleware uses `@supabase/ssr`'s `createServerClient`, which reads sessions from cookies. Always use `createBrowserClient` from `@supabase/ssr` (not `createClient` from `@supabase/supabase-js`) so sessions are visible to the middleware.

---

## Adapting for Another District

This portal was built for the CMD but the architecture is generic enough to adapt for any denomination or credentialling body with a multi-year, multi-requirement ordination or licensing process. The main things you would need to customise:

- **Requirement templates** — the 17-requirement structure (10 book reports, 4 papers, 3 sermons) and the theological topic list are CMD-specific; these live in the database as seeded data
- **Handbook content** — all wiki content is in `app/handbook/content.ts` as a typed data structure; replace with your own handbook text
- **Pardington's system prompt** — lives in `app/api/study-agent/route.ts`; includes the full CMD handbook, reading list, and interview questions
- **Branding** — CMD dark blue (`#00426A`) and Alliance blue (`#0077C8`) colour constants appear at the top of each page file; the CMD logo is at `public/cmd-logo.png`
- **Email sending domain** — configured in Resend; update the `from` address in each API route that sends email

---

## Acknowledgements

Built for the Canadian Midwest District of the Christian and Missionary Alliance.

*Pardington is named in honour of [George Palmer Pardington](https://en.wikipedia.org/wiki/George_Palmer_Pardington) (1858–1925), Alliance theologian and close colleague of A.B. Simpson.*
