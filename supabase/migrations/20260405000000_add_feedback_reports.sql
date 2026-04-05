-- Migration: add feedback_reports table
-- Purpose: stores bug reports and feature requests submitted via the in-portal feedback modal

create table if not exists feedback_reports (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references auth.users(id) on delete set null,
  user_email   text,
  user_name    text,
  type         text        not null check (type in ('bug', 'feature')),
  title        text        not null,
  description  text        not null,
  page_url     text,
  created_at   timestamptz default now()
);

alter table feedback_reports enable row level security;

-- Any authenticated user can submit feedback
create policy "Authenticated users can submit feedback"
  on feedback_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins can read all feedback (visible in Admin Console → Activity tab)
create policy "Admins can read feedback"
  on feedback_reports for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and roles @> array['admin']
    )
  );
