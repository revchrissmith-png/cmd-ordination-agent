-- Adds is_demo flag to profiles so demo/recording accounts can be filtered
-- out of every admin-facing list, count, and outbound email path.
--
-- Convention: every profile whose email matches '%@cmd-demo.local' must have
-- is_demo = true. Set on insert; never toggled afterwards.

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

create index if not exists profiles_is_demo_idx
  on public.profiles (is_demo)
  where is_demo = true;
