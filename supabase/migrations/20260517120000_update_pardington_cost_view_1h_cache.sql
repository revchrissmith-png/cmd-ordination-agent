-- 20260517120000_update_pardington_cost_view_1h_cache.sql
-- The study-agent route now caches the system prompt with a 1-hour TTL
-- instead of the 5-minute default. 1-hour cache writes bill at 2x the base
-- input rate (vs 1.25x for 5-minute), so the cost rollup is updated to
-- match. All cache_creation_input_tokens going forward are 1-hour writes;
-- pardington_usage held no rows under the old 5-minute rate.
--
-- Rates are Claude Haiku 4.5, USD per million tokens:
--   input $1.00 · output $5.00 · cache write (1h) $2.00 · cache read $0.10

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
    + sum(u.cache_creation_input_tokens) * 2.00
    + sum(u.cache_read_input_tokens)     * 0.10
    ) / 1000000.0
  , 4)                                as estimated_cost_usd,
  min(u.created_at)                   as first_used,
  max(u.created_at)                   as last_used
from public.pardington_usage u
left join public.profiles p on p.id = u.ordinand_id
group by u.ordinand_id, p.full_name;

grant select on public.pardington_usage_by_user to authenticated;
