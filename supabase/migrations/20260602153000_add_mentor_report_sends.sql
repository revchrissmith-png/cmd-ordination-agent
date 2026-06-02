-- Tracked sends for the monthly mentor report.
--
-- The report itself (mentor_reports.answers) is a protected space: ordinand and
-- admin only, never the Council. This table records ONLY the send metadata —
-- that a report was emailed to the mentor, when, and to which address — so the
-- Council and admins can confirm a report went out WITHOUT seeing its contents.
-- No answer text lives here by design.

create table if not exists public.mentor_report_sends (
  id           uuid primary key default gen_random_uuid(),
  ordinand_id  uuid not null references public.profiles(id) on delete cascade,
  month        text not null,                         -- "YYYY-MM"
  mentor_name  text,
  mentor_email text not null,
  resend_id    text,                                  -- Resend message id, for delivery lookups
  status       text not null default 'sent',
  sent_at      timestamptz not null default now(),
  unique (ordinand_id, month)
);

alter table public.mentor_report_sends enable row level security;

-- Ordinands see their own send records.
create policy "Ordinands view own report sends"
  on public.mentor_report_sends
  for select
  using (auth.uid() = ordinand_id);

-- Admins and Council see send metadata only (the answers stay in mentor_reports,
-- which Council cannot read). This is the tracking surface, not the content.
create policy "Admins and council view report sends"
  on public.mentor_report_sends
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('admin' = any(p.roles) or 'council' = any(p.roles))
    )
  );

-- No INSERT/UPDATE policy for authenticated users: writes happen exclusively
-- through the send route using the service role.
grant select on public.mentor_report_sends to authenticated;
