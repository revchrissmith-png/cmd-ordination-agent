-- Periodic mentor evaluations ("progress check-ins") + church covenant tracking.
-- Spec: Specs/cmd-mentor-progress-evaluations-spec.md
--
-- Two early, lighter, fully-narrative mentor check-ins per ordinand (rounds 1 & 2),
-- anchored to the cohort deadline (D−23mo, D−11mo), distinct from the existing
-- summative final evaluation (which stays in evaluations/evaluation_tokens).
--
-- Privacy (Pardington model): the SPECIFICS are admin-only (Chris + Michelle, both
-- 'admin'); Council never sees the raw text — only a synthesized arc in the final
-- report. So RLS here is admin-only for ALL access. The anonymous mentor form does
-- NOT touch this table directly; it goes through service-role API routes, keeping
-- the admin-only boundary intact.

create table if not exists public.mentor_progress_checkins (
  id                  uuid primary key default gen_random_uuid(),
  ordinand_id         uuid not null references public.profiles(id) on delete cascade,
  round               smallint not null check (round in (1, 2)),
  due_date            date not null,                 -- frozen snapshot; not recomputed on deadline shift
  token               uuid not null unique default gen_random_uuid(),
  status              text not null default 'scheduled' check (status in ('scheduled', 'sent', 'submitted')),
  -- recipient snapshot (who it was actually sent to, at send time)
  mentor_name         text,
  mentor_email        text,
  -- narrative responses (the "why")
  q_meeting_diligence text,
  q_pace              text,
  q_struggles         text,
  requested_meeting   boolean,                       -- item 4: mentor wants to meet with Chris
  additional_comments text,
  -- lifecycle
  sent_at             timestamptz,
  submitted_at        timestamptz,
  reviewed_at         timestamptz,                   -- admin opened it (clears the dashboard alert)
  reviewed_by         uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (ordinand_id, round)
);

create index if not exists idx_mpc_ordinand on public.mentor_progress_checkins (ordinand_id);
create index if not exists idx_mpc_dispatch on public.mentor_progress_checkins (status, due_date);

alter table public.mentor_progress_checkins enable row level security;

-- Admin-only (Chris + Michelle). Council/observer/ordinand get nothing.
-- Anonymous mentor submissions are mediated by service-role API routes, which
-- bypass RLS, so no anon policy is needed (or wanted) here.
create policy "Admins manage progress check-ins"
  on public.mentor_progress_checkins
  for all
  using (public.is_admin())
  with check (public.is_admin());


-- Church covenant acknowledgment (spec §7b, Option C): the existing signed paper
-- covenant, scanned and uploaded by Michelle like an assignment, stored as the
-- portal's system of record. One per ordinand.
create table if not exists public.church_covenant_acknowledgments (
  id           uuid primary key default gen_random_uuid(),
  ordinand_id  uuid not null unique references public.profiles(id) on delete cascade,
  file_url     text not null,
  letter_date  date,                                 -- date on the signed letter
  uploaded_by  uuid references public.profiles(id),
  uploaded_at  timestamptz not null default now()
);

alter table public.church_covenant_acknowledgments enable row level security;

-- Admin/DMC only. Uploaded by an authenticated admin (Michelle) from the
-- candidate page; file lives in the existing 'submissions' storage bucket.
create policy "Admins manage covenant acknowledgments"
  on public.church_covenant_acknowledgments
  for all
  using (public.is_admin())
  with check (public.is_admin());
