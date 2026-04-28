-- supabase/demo-seed/jordan-smith.sql
-- One-shot seed for the "Jordan Smith" demo ordinand used for training-video
-- recording. Idempotent: re-running upserts and re-asserts the spec'd state.
--
-- Spec: Work/CMD Ordination Portal/Training Videos/02-demo-data-spec.md
-- Handoff: Handoffs/handoff-2026-04-27-nova-demo-data-jordan-smith.md
--
-- IMPORTANT: This script writes directly into the production database. Every
-- row created here has profiles.is_demo = true (or is keyed off the demo
-- account ids), which the application code uses to filter demo data out of
-- admin views, the daily report cron, and the auto-assign grader logic.
--
-- Run via the Supabase MCP `execute_sql` against project cqqvxfructdtvtnaggdh.
-- After running, use scripts/demo-login-link.mjs to mint a magic-link URL for
-- Chris to sign in as Jordan (real OTP delivery to *@cmd-demo.local would
-- bounce, so we use admin-generated magic links instead).

begin;

-- ── 1. Auth users ──────────────────────────────────────────────────────────
-- Fixed UUIDs make the seed idempotent and let downstream rows reference
-- the demo accounts by literal id without lookup.
--
-- raw_user_meta_data is read by handle_new_user() to populate the matching
-- public.profiles row on insert. The trigger does an ON CONFLICT (id) DO
-- UPDATE so re-running this block is safe.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'd3300001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'jordan.smith@cmd-demo.local',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Jordan","last_name":"Smith","role":"ordinand"}'::jsonb,
    now() - interval '14 months', now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3300001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated',
    'alex.bennett@cmd-demo.local',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Alex","last_name":"Bennett","role":"council"}'::jsonb,
    now() - interval '24 months', now(),
    '', '', '', ''
  )
on conflict (id) do update set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  email_confirmed_at = excluded.email_confirmed_at,
  updated_at = now();

-- ── 2. Profiles — set role array, cohort, mentor, is_demo flag ─────────────
-- handle_new_user() created baseline rows; finish them off here.

update public.profiles set
  first_name = 'Jordan',
  last_name = 'Smith',
  email = 'jordan.smith@cmd-demo.local',
  roles = array['ordinand']::text[],
  status = 'active',
  cohort_id = '5edc53fa-67b6-4e0b-aa45-4424dd95941d',  -- Spring 2027
  mentor_name = 'Pastor Casey Reeve',
  mentor_email = 'casey.reeve@cmd-demo.local',
  is_demo = true,
  pardington_consent_at = now() - interval '6 months'
where id = 'd3300001-0000-4000-8000-000000000001';

update public.profiles set
  first_name = 'Alex',
  last_name = 'Bennett',
  email = 'alex.bennett@cmd-demo.local',
  roles = array['council']::text[],
  status = 'active',
  is_demo = true,
  grading_types = array['book_report','paper','sermon']::text[]
where id = 'd3300001-0000-4000-8000-000000000002';

-- ── 3. Cohort calendar — Spring 2027 events for clip #13 ───────────────────
-- Spring 2027 cohort already exists. Two events are already linked to it
-- (Homiletics Sep 24, Paper Prep Divine Healing Nov 26) — these serve as the
-- "further future" entries. We add a past gathering, a near-upcoming, and an
-- annual in-person gathering.
--
-- All event ids are deterministic so re-runs upsert.

insert into public.cohort_events (
  id, cohort_id, cohort_ids, title, event_date, event_type, location, notes
) values
  (
    'd3300002-0000-4000-8000-000000000001',
    '5edc53fa-67b6-4e0b-aa45-4424dd95941d',
    array['5edc53fa-67b6-4e0b-aa45-4424dd95941d']::uuid[],
    'Cohort Orientation Webinar',
    '2026-02-12', 'online', null,
    'Welcome session for the Spring 2027 cohort. Recording available on the cohort hub.'
  ),
  (
    'd3300002-0000-4000-8000-000000000002',
    '5edc53fa-67b6-4e0b-aa45-4424dd95941d',
    array['5edc53fa-67b6-4e0b-aa45-4424dd95941d']::uuid[],
    'Reading Discussion: History (All For Jesus)',
    '2026-05-21', 'online', null,
    'Discussion of the History category book reports. Bring your study notes.'
  ),
  (
    'd3300002-0000-4000-8000-000000000003',
    '5edc53fa-67b6-4e0b-aa45-4424dd95941d',
    array['5edc53fa-67b6-4e0b-aa45-4424dd95941d']::uuid[],
    'Spring 2027 Annual Cohort Gathering',
    '2026-08-13', 'in_person',
    'Camp Tagatiwabin · 32048 Range Road 14, Pine Lake AB',
    'Three-day in-person gathering: teaching, prayer, mentor check-ins, and cohort fellowship. Travel funded by district.'
  )
on conflict (id) do update set
  cohort_id = excluded.cohort_id,
  cohort_ids = excluded.cohort_ids,
  title = excluded.title,
  event_date = excluded.event_date,
  event_type = excluded.event_type,
  location = excluded.location,
  notes = excluded.notes;

-- ── 4. Ordinand requirements — 17 cards in spec'd states ───────────────────
-- The 10 book reports, 4 papers, and 3 sermons map to existing
-- requirement_templates rows. Statuses follow the spec table.
--
-- Card → state mapping for clip planning:
--   BR1 (history)              → complete       (graded; clip #07 source)
--   BR2 (theology 1 of 2)      → submitted      ("in queue")
--   BR3 (theology 2 of 2)      → revision_required  (clip #08 source)
--   BR4 (deeper_life)          → not_started    ★ clip #04 dropdown beat (2 options)
--   BR5 (missions)             → not_started    (3 options)
--   BR6 (holy_scripture)       → not_started    (2 options)
--   BR7 (anthropology 1 of 2)  → not_started    (3 options)
--   BR8 (anthropology 2 of 2)  → not_started    (3 options)
--   BR9 (disciple_making)      → not_started    (1 option)
--   BR10 (specific_ministry)   → not_started    (free text)
--   P1 christ_centred          → not_started   (in_progress draft via submission)
--   P2 spirit_empowered        → not_started
--   P3 mission_focused         → not_started
--   P4 scripture               → not_started
--   S1 christ_centred Q1       → submitted     (clip #06 source — video URL)
--   S2 spirit_empowered Q1     → not_started
--   S3 mission_focused Q1      → not_started

with v as (
  select
    'd3300001-0000-4000-8000-000000000001'::uuid as ordinand_id,
    '5edc53fa-67b6-4e0b-aa45-4424dd95941d'::uuid as cohort_id
)
insert into public.ordinand_requirements (id, ordinand_id, template_id, cohort_id, status, created_at, updated_at)
select * from (values
  -- Book reports
  ('d3300003-0000-4000-8000-000000000001'::uuid, (select ordinand_id from v), '802e9419-29f6-4a4d-ae88-4276aa5b73cb'::uuid, (select cohort_id from v), 'complete'::requirement_status,           now() - interval '90 days', now() - interval '24 days'),
  ('d3300003-0000-4000-8000-000000000002'::uuid, (select ordinand_id from v), '7f746e32-8c59-4c61-a32c-c117879032bb'::uuid, (select cohort_id from v), 'submitted'::requirement_status,          now() - interval '60 days', now() - interval '5 days'),
  ('d3300003-0000-4000-8000-000000000003'::uuid, (select ordinand_id from v), 'dc194f1c-e99d-4b2f-8400-e8819016230b'::uuid, (select cohort_id from v), 'revision_required'::requirement_status,  now() - interval '70 days', now() - interval '12 days'),
  ('d3300003-0000-4000-8000-000000000004'::uuid, (select ordinand_id from v), 'c2dd5b75-38dc-410d-9e4a-ac99919e923a'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-000000000005'::uuid, (select ordinand_id from v), 'e28bea9f-193e-458a-b740-8d1e7da60c07'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-000000000006'::uuid, (select ordinand_id from v), '8031b9ef-f012-4c3f-a479-0a0b1e67da8b'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-000000000007'::uuid, (select ordinand_id from v), 'e58014ea-906d-4314-a286-a473e1b933e7'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-000000000008'::uuid, (select ordinand_id from v), 'a1299c59-9d6d-42a0-98e4-71f6ef277b59'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-000000000009'::uuid, (select ordinand_id from v), '12c20b13-3ea2-4752-a00f-09fb22cf48e3'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-00000000000a'::uuid, (select ordinand_id from v), '9ae06672-1e21-49db-8f40-4b1a0f1e4766'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  -- Papers
  ('d3300003-0000-4000-8000-00000000000b'::uuid, (select ordinand_id from v), '354cc77f-b9a6-4bdb-a02a-97e72337e3af'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '3 days'),
  ('d3300003-0000-4000-8000-00000000000c'::uuid, (select ordinand_id from v), '052c166e-d9b8-4f7e-a0df-3dd0bdc068d2'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-00000000000d'::uuid, (select ordinand_id from v), '13cefcf8-4cac-4f75-a643-343de4419472'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-00000000000e'::uuid, (select ordinand_id from v), '7a67d15e-ae6b-4e6c-ad55-b10b8f88a0be'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  -- Sermons
  ('d3300003-0000-4000-8000-00000000000f'::uuid, (select ordinand_id from v), 'ca8046ae-95d2-4a50-baaf-19d783648835'::uuid, (select cohort_id from v), 'submitted'::requirement_status,          now() - interval '90 days', now() - interval '8 days'),
  ('d3300003-0000-4000-8000-000000000010'::uuid, (select ordinand_id from v), 'aaf62601-67fe-4d69-8ad3-81ce53d6b96f'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days'),
  ('d3300003-0000-4000-8000-000000000011'::uuid, (select ordinand_id from v), '63080d2d-2965-4924-9264-821f042d89a3'::uuid, (select cohort_id from v), 'not_started'::requirement_status,        now() - interval '90 days', now() - interval '90 days')
) as t(id, ordinand_id, template_id, cohort_id, status, created_at, updated_at)
on conflict (id) do update set
  ordinand_id = excluded.ordinand_id,
  template_id = excluded.template_id,
  cohort_id = excluded.cohort_id,
  status = excluded.status,
  updated_at = excluded.updated_at;

-- ── 5. Submissions ─────────────────────────────────────────────────────────
-- Three real submissions (BR1 graded, BR2 awaiting, BR3 revision-required),
-- one paper draft (P1 in progress with self_assessment but no file),
-- one sermon submission with video URL (S1 awaiting).
--
-- file_url is a placeholder pointing at the submissions bucket; the demo
-- doesn't actually need the bytes to render, just a non-empty URL so the UI
-- shows the "view submission" affordance.

insert into public.submissions (
  id, ordinand_requirement_id, ordinand_id, file_url, file_name,
  version, submitted_at, notes, self_assessment, selected_book
) values
  -- BR1 graded — All For Jesus (history)
  (
    'd3300004-0000-4000-8000-000000000001',
    'd3300003-0000-4000-8000-000000000001',
    'd3300001-0000-4000-8000-000000000001',
    'demo/jordan/book-report-1-niklaus.pdf',
    'book-report-1-niklaus.pdf',
    1, now() - interval '40 days',
    'Book report on All For Jesus (Niklaus). Submitted for the History category.',
    null,
    'All For Jesus — Robert L. Niklaus'
  ),
  -- BR2 submitted, awaiting feedback — Surprised by Hope (theology 1 of 2)
  (
    'd3300004-0000-4000-8000-000000000002',
    'd3300003-0000-4000-8000-000000000002',
    'd3300001-0000-4000-8000-000000000001',
    'demo/jordan/book-report-2-wright.pdf',
    'book-report-2-wright.pdf',
    1, now() - interval '6 days',
    'Book report on Surprised by Hope (N.T. Wright). Eager to discuss the resurrection chapter.',
    null,
    'Surprised by Hope: Rethinking Heaven, the Resurrection, and the Mission of the Church — N.T. Wright'
  ),
  -- BR3 revision required — Rethinking Holiness (theology 2 of 2)
  (
    'd3300004-0000-4000-8000-000000000003',
    'd3300003-0000-4000-8000-000000000003',
    'd3300001-0000-4000-8000-000000000001',
    'demo/jordan/book-report-3-vandewalle.pdf',
    'book-report-3-vandewalle.pdf',
    1, now() - interval '14 days',
    'Book report on Rethinking Holiness (Bernie Van De Walle). First pass — looking forward to feedback.',
    null,
    'Rethinking Holiness: A Theological Introduction — Bernie Van De Walle'
  ),
  -- P1 paper draft — Christ-Centred Life and Ministry (in progress)
  (
    'd3300004-0000-4000-8000-000000000004',
    'd3300003-0000-4000-8000-00000000000b',
    'd3300001-0000-4000-8000-000000000001',
    '',
    '',
    1, null,
    'Draft saved. Working through the section on Christ-confessing humility — outline complete, body ~40 percent drafted.',
    jsonb_build_object(
      'thesis_clarity', 'developing',
      'engagement_with_sources', 'developing',
      'pastoral_application', 'not_yet_addressed',
      'self_notes', 'Need to weave the exegesis section more tightly into the call-and-response structure of the doctrine.'
    ),
    null
  ),
  -- S1 sermon submission — Christ-Centred Q1 (submitted with video URL)
  (
    'd3300004-0000-4000-8000-000000000005',
    'd3300003-0000-4000-8000-00000000000f',
    'd3300001-0000-4000-8000-000000000001',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'sermon-1-christ-centred-q1.mp4',
    1, now() - interval '9 days',
    'Sermon delivered at Rosewood Park Alliance Church on 2026-04-12. Video link above. Manuscript also uploaded separately.',
    jsonb_build_object('preached_on', '2026-04-12', 'congregation_size_estimate', 110, 'sermon_length_minutes', 32),
    null
  )
on conflict (id) do update set
  ordinand_requirement_id = excluded.ordinand_requirement_id,
  ordinand_id = excluded.ordinand_id,
  file_url = excluded.file_url,
  file_name = excluded.file_name,
  notes = excluded.notes,
  self_assessment = excluded.self_assessment,
  selected_book = excluded.selected_book,
  submitted_at = excluded.submitted_at;

-- ── 6. Grading assignment + grade — BR1 graded by Pastor Alex Bennett ──────
-- This row backs clip #07 ("here's what graded feedback looks like").
-- The feedback text is a placeholder pastoral draft; refine via Sage before
-- the clip #07 read-aloud recording.

insert into public.grading_assignments (id, ordinand_requirement_id, council_member_id, assigned_by, assigned_at, notes) values
  (
    'd3300005-0000-4000-8000-000000000001',
    'd3300003-0000-4000-8000-000000000001',
    'd3300001-0000-4000-8000-000000000002',  -- Alex Bennett
    'd3300001-0000-4000-8000-000000000002',  -- self-assigned for the demo
    now() - interval '40 days',
    'Demo grading assignment — Alex assigned to Jordan''s book report 1 for the recording.'
  ),
  (
    'd3300005-0000-4000-8000-000000000002',
    'd3300003-0000-4000-8000-000000000003',  -- BR3 revision_required
    'd3300001-0000-4000-8000-000000000002',
    'd3300001-0000-4000-8000-000000000002',
    now() - interval '14 days',
    'Demo grading assignment — Alex assigned to Jordan''s book report 3 (the revision-required one).'
  )
on conflict (id) do update set
  ordinand_requirement_id = excluded.ordinand_requirement_id,
  council_member_id = excluded.council_member_id,
  assigned_by = excluded.assigned_by,
  assigned_at = excluded.assigned_at,
  notes = excluded.notes;

insert into public.grades (
  id, submission_id, grading_assignment_id, overall_rating, overall_comments,
  paper_assessment, graded_at, graded_by, is_draft
) values
  (
    'd3300006-0000-4000-8000-000000000001',
    'd3300004-0000-4000-8000-000000000001',  -- BR1 submission
    'd3300005-0000-4000-8000-000000000001',  -- BR1 assignment
    'good'::rating_scale,
    E'Jordan, thank you for this thoughtful engagement with Niklaus''s account of A.B. Simpson''s life. You name with clarity the through-line that animates Simpson''s story — the gospel-driven impulse toward the unreached — and you situate his founding of the Alliance not as institutional ambition but as response to Christ''s call. That instinct serves you well; you read this as a missionary biography, not merely a denominational history.\n\nI''d push you a little on §3 of your report. You frame Simpson''s "deeper life" emphasis as primarily a personal piety, but the same chapter in Niklaus is also tracing how that interior conviction became the public engine of mission deployment. The two are inseparable in Simpson''s mind, and your paper would land harder if you held them together rather than treating them sequentially. Have a look at chapters 11–13 again — particularly the New York Tabernacle period — and notice how often a deeper-life sermon ends with a missionary appeal.\n\nThe theological reflection in your closing section is honest and pastorally real, especially the line about your own inclination toward stability over sending. That kind of self-aware reading is exactly what this requirement is meant to surface. Keep that posture as you head into the Theology category — it will serve you. Marked complete; well done.\n\n— Pastor Alex Bennett',
    null,
    now() - interval '24 days',
    'd3300001-0000-4000-8000-000000000002',
    false
  )
on conflict (id) do update set
  submission_id = excluded.submission_id,
  grading_assignment_id = excluded.grading_assignment_id,
  overall_rating = excluded.overall_rating,
  overall_comments = excluded.overall_comments,
  graded_at = excluded.graded_at,
  graded_by = excluded.graded_by,
  is_draft = excluded.is_draft;

-- ── 7. Mentor report — submitted last month ────────────────────────────────
-- One row, status submitted, dated last month so it shows as "recent" on the
-- dashboard activity timeline.

insert into public.mentor_reports (id, ordinand_id, month, answers, is_draft, submitted_at, created_at, updated_at)
values
  (
    'd3300007-0000-4000-8000-000000000001',
    'd3300001-0000-4000-8000-000000000001',
    to_char((current_date - interval '1 month'), 'YYYY-MM'),
    jsonb_build_object(
      'engagement_quality', 'consistent — meeting weekly, mostly in person',
      'spiritual_growth_observed', 'Jordan continues to grow in confident dependence. Recent shift toward listening more in mentor conversations rather than rushing to articulate a position.',
      'concerns', 'None substantive. Mild concern about pace of paper writing alongside congregational responsibilities — flagged for Jordan''s own awareness.',
      'mentor_recommendation', 'Continue. Trajectory is healthy.'
    ),
    false,
    now() - interval '14 days',
    now() - interval '21 days',
    now() - interval '14 days'
  )
on conflict (id) do update set
  ordinand_id = excluded.ordinand_id,
  month = excluded.month,
  answers = excluded.answers,
  is_draft = excluded.is_draft,
  submitted_at = excluded.submitted_at,
  updated_at = excluded.updated_at;

-- ── 8. Pardington logs — 2 prior conversations ─────────────────────────────
-- Each session is a row with a messages jsonb array. The first user message
-- in each is the de-facto "title" used by the history sidebar (per the spec
-- for clips #11 and #12).

insert into public.pardington_logs (
  id, session_id, ordinand_id, messages, message_count, started_at, last_message_at, created_at
) values
  (
    'd3300008-0000-4000-8000-000000000001',
    'd3300008-1111-4000-8000-000000000001',
    'd3300001-0000-4000-8000-000000000001',
    jsonb_build_array(
      jsonb_build_object('role', 'user',      'content', 'Reformed vs. Wesleyan view of sanctification — help me understand the difference and where the Alliance lands.'),
      jsonb_build_object('role', 'assistant', 'content', 'Good question, Jordan — this one shows up often around the deeper-life category. The Reformed tradition tends to emphasize sanctification as a progressive work of the Spirit grounded in Christ''s already-accomplished righteousness, while classical Wesleyan thought adds a distinctive moment of "entire sanctification" or perfect love. The Alliance tradition holds these in tension through Simpson''s "Christ Our Sanctifier" — sanctification as both crisis and process, anchored in union with Christ rather than human effort. Want to dig into a specific text?'),
      jsonb_build_object('role', 'user',      'content', 'Yes — what should I read first to get a feel for the Alliance position specifically?'),
      jsonb_build_object('role', 'assistant', 'content', 'Start with A.B. Simpson''s Wholly Sanctified — short, accessible, and the foundational primary source. Pair it with Bernie Van De Walle''s Rethinking Holiness for a contemporary theological retrieval that engages both Reformed and Wesleyan interlocutors honestly.')
    ),
    4,
    now() - interval '32 days',
    now() - interval '32 days',
    now() - interval '32 days'
  ),
  (
    'd3300008-0000-4000-8000-000000000002',
    'd3300008-1111-4000-8000-000000000002',
    'd3300001-0000-4000-8000-000000000001',
    jsonb_build_array(
      jsonb_build_object('role', 'user',      'content', 'Help me prepare for my oral interview — what kinds of questions do council members typically ask?'),
      jsonb_build_object('role', 'assistant', 'content', 'I''ll be careful here, Jordan — the Council asks what they ask in the moment, not from a script, and your job is to come honestly rather than pre-rehearsed. That said, three patterns recur: (1) call narrative — when did you first sense the Lord''s call to vocational ministry, and how has that conviction deepened since? (2) doctrinal location — where do you stand on a contested point in Alliance theology, and why? (3) pastoral instinct — describe a moment in ministry that revealed something about your character, including how you''d handle it differently. Want to think through any of these together?'),
      jsonb_build_object('role', 'user',      'content', 'The doctrinal location one — I get nervous talking about points where I''m still working things out.'),
      jsonb_build_object('role', 'assistant', 'content', 'That nervousness is actually the right starting posture. Council members are not looking for ordinands who have everything settled; they''re looking for ordinands who can name what is unsettled, articulate what they hold and why, and remain teachable. "I''m still working through the implications of X, but here is where I currently land and what is shaping my thinking" is a stronger answer than confident certainty in either direction. Want to try one out loud — pick a point you''re wrestling with?')
    ),
    4,
    now() - interval '11 days',
    now() - interval '11 days',
    now() - interval '11 days'
  )
on conflict (id) do update set
  session_id = excluded.session_id,
  ordinand_id = excluded.ordinand_id,
  messages = excluded.messages,
  message_count = excluded.message_count,
  started_at = excluded.started_at,
  last_message_at = excluded.last_message_at;

commit;

-- ── Verification ───────────────────────────────────────────────────────────
-- Run after the seed completes:
--
-- select count(*) filter (where status = 'complete')           as graded,
--        count(*) filter (where status = 'submitted')          as awaiting,
--        count(*) filter (where status = 'revision_required')  as revision,
--        count(*) filter (where status = 'not_started')        as not_started,
--        count(*)                                              as total
-- from ordinand_requirements
-- where ordinand_id = 'd3300001-0000-4000-8000-000000000001';
--
-- Expected: graded=1, awaiting=2, revision=1, not_started=13, total=17.
-- (awaiting=2 because both BR2 and the sermon submission have status 'submitted'.)
