-- 20260517000000_add_pardington_usage.sql
-- Per-request Anthropic token usage tracking for Pardington (the AI study
-- partner). One row per study-agent API call, written server-side from
-- app/api/study-agent/route.ts with the service role key.
--
-- Purpose: let admins see what each ordinand's Pardington use costs the
-- district. pardington_logs already tracks *messages* per ordinand; this
-- tracks *tokens* — the thing Anthropic actually bills.

-- ── 1. Table ───────────────────────────────────────────────────────────────
create table if not exists public.pardington_usage (
  id                          uuid        primary key default gen_random_uuid(),
  ordinand_id                 uuid        not null references public.profiles(id) on delete cascade,
  model                       text        not null,
  input_tokens                integer     not null default 0,
  output_tokens               integer     not null default 0,
  cache_creation_input_tokens integer     not null default 0,
  cache_read_input_tokens     integer     not null default 0,
  created_at                  timestamptz not null default now()
);

create index if not exists pardington_usage_ordinand_idx
  on public.pardington_usage (ordinand_id, created_at desc);

-- ── 2. RLS ─────────────────────────────────────────────────────────────────
-- Inserts come from the route via the service role key, which bypasses RLS.
-- The only policy needed is admin read access for reporting.
alter table public.pardington_usage enable row level security;

grant select on public.pardington_usage to authenticated;

drop policy if exists pardington_usage_admin_read on public.pardington_usage;
create policy pardington_usage_admin_read
on public.pardington_usage
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.roles @> array['admin']
  )
);

-- ── 3. Per-ordinand cost rollup view ───────────────────────────────────────
-- Pricing constants live here so a rate change is a one-line view update
-- with no backfill. Rates are Claude Haiku 4.5, USD per million tokens:
--   input $1.00 · output $5.00 · cache write $1.25 · cache read $0.10
-- security_invoker so the admin-only RLS policy above governs the view too.
create or replace view public.pardington_usage_by_user
with (security_invoker = true) as
select
  u.ordinand_id,
  p.full_name,
  count(*)                            as requests,
  sum(u.input_tokens)                 as input_tokens,
  sum(u.output_tokens)                as output_tokens,
  sum(u.cache_creation_input_tokens)  as cache_write_tokens,
  sum(u.cache_read_input_tokens)      as cache_read_tokens,
  round(
    ( sum(u.input_tokens)                * 1.00
    + sum(u.output_tokens)               * 5.00
    + sum(u.cache_creation_input_tokens) * 1.25
    + sum(u.cache_read_input_tokens)     * 0.10
    ) / 1000000.0
  , 4)                                as estimated_cost_usd,
  min(u.created_at)                   as first_used,
  max(u.created_at)                   as last_used
from public.pardington_usage u
left join public.profiles p on p.id = u.ordinand_id
group by u.ordinand_id, p.full_name;

grant select on public.pardington_usage_by_user to authenticated;
