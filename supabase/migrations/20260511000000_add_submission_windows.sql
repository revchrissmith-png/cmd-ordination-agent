-- 20260511000000_add_submission_windows.sql
-- Adds a `submission_windows` table that controls when ordinand submissions
-- are paused. Used for the 2026-05-25 → 2026-06-01 council quiet-week and
-- any future pause events (council retreats, holidays).
--
-- Enforcement is a RESTRICTIVE RLS policy on `submissions`: non-admin
-- INSERTs fail when now() falls inside any active window. Mentor reports,
-- Pardington, and read-only browsing are intentionally unaffected.

-- ── 1. Table ───────────────────────────────────────────────────────────────
create table if not exists public.submission_windows (
  id            uuid        primary key default gen_random_uuid(),
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  banner_title  text        not null,
  banner_body   text        not null,
  reason        text,
  created_at    timestamptz not null default now(),
  constraint submission_windows_ordered check (end_at > start_at)
);

create index if not exists submission_windows_active_idx
  on public.submission_windows (start_at, end_at);

-- ── 2. Pause-check function ────────────────────────────────────────────────
-- security definer so the RLS policy on submissions can call it
-- without exposing submission_windows to a broader role.
create or replace function public.is_submission_paused()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.submission_windows
    where now() >= start_at and now() < end_at
  );
$$;

revoke all on function public.is_submission_paused() from public;
grant execute on function public.is_submission_paused() to authenticated;

-- ── 3. RLS on the windows table itself ─────────────────────────────────────
alter table public.submission_windows enable row level security;

-- Everyone authenticated can read windows (so the client banner can render).
drop policy if exists submission_windows_read on public.submission_windows;
create policy submission_windows_read
on public.submission_windows
for select
to authenticated
using (true);

-- Only admins can mutate windows.
drop policy if exists submission_windows_admin_write on public.submission_windows;
create policy submission_windows_admin_write
on public.submission_windows
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.roles @> array['admin']
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.roles @> array['admin']
  )
);

-- ── 4. RESTRICTIVE pause gate on submissions INSERT ────────────────────────
-- Non-admin INSERTs fail during an active pause window. The existing
-- permissive policies still control row-ownership; this policy ANDs on
-- top of them.
drop policy if exists submissions_pause_gate on public.submissions;
create policy submissions_pause_gate
on public.submissions
as restrictive
for insert
to authenticated
with check (
  not public.is_submission_paused()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.roles @> array['admin']
  )
);

-- ── 5. Seed the council quiet-week ─────────────────────────────────────────
-- America/Regina is CST year-round (no DST). Both boundaries are -06:00.
insert into public.submission_windows (start_at, end_at, banner_title, banner_body, reason)
select
  '2026-05-25 12:00:00-06'::timestamptz,
  '2026-06-01 08:00:00-06'::timestamptz,
  'Submissions are paused May 25 – June 1',
  'The Council is taking this week to prepare for the launch of the new portal. You can still browse your requirements, read feedback, and use Pardington — full submissions resume Monday June 1 at 8 a.m. Central.',
  'Council quiet week before portal go-live'
where not exists (
  select 1 from public.submission_windows
  where start_at = '2026-05-25 12:00:00-06'::timestamptz
);
