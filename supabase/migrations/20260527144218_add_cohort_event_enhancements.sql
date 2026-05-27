-- Cohort event enhancements driven by council feedback (May 2026 meetings):
--
--   1. Online cohort meetings happen at specific times, not just on a date.
--      Add event_time (Regina wall-clock, no DST drift since SK doesn't observe).
--
--   2. Council members work in three loosely-constructed teams — Preaching,
--      Papers, and Reading Discussions — that map to event content but
--      occasionally flex when availability is limited. Track:
--        a. event.team        — which team owns this event by default
--        b. profile.council_team — each council member's home team
--        c. cohort_event_council_assignments — per-event actual assignees
--           (pre-filled from team membership, but admin can swap individuals)
--
--   3. Notification cadence: T-50 to council (Michelle wants review),
--      T-30 to ordinands (attendance expectations), T-3 to all (warm
--      reminder). Track sends in cohort_event_notifications_sent so
--      cron is safely idempotent on re-runs.

-- ── 1. Event time ─────────────────────────────────────────────────────────
ALTER TABLE cohort_events
  ADD COLUMN event_time time;

COMMENT ON COLUMN cohort_events.event_time IS
  'Start time in Regina wall-clock (America/Regina, CST year-round). NULL for events without a fixed time (e.g. all-day in-person gatherings).';

-- ── 2. Team & council assignments ─────────────────────────────────────────
ALTER TABLE cohort_events
  ADD COLUMN team text
    CHECK (team IS NULL OR team IN ('preaching', 'papers', 'reading_discussions'));

COMMENT ON COLUMN cohort_events.team IS
  'Default council team responsible for this event. NULL for events that do not map to a marking team (e.g. retreats, in-person gatherings).';

ALTER TABLE profiles
  ADD COLUMN council_team text
    CHECK (council_team IS NULL OR council_team IN ('preaching', 'papers', 'reading_discussions'));

COMMENT ON COLUMN profiles.council_team IS
  'Home team for council members. Used to pre-fill assignment lists when an event is created with a matching team; assignments remain editable per-event.';

CREATE TABLE cohort_event_council_assignments (
  event_id    uuid NOT NULL REFERENCES cohort_events(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);

CREATE INDEX cohort_event_council_assignments_profile_idx
  ON cohort_event_council_assignments (profile_id);

COMMENT ON TABLE cohort_event_council_assignments IS
  'Per-event council assignment. Pre-filled from profiles.council_team when event.team is set, but admin can add or remove anyone with the council role to handle availability gaps.';

ALTER TABLE cohort_event_council_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all assignments"
  ON cohort_event_council_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'admin' = ANY (profiles.roles)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'admin' = ANY (profiles.roles)
  ));

CREATE POLICY "Council reads all assignments"
  ON cohort_event_council_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'council' = ANY (profiles.roles)
  ));

CREATE POLICY "Ordinands read assignments for their cohort events"
  ON cohort_event_council_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cohort_events e, profiles p
    WHERE e.id = cohort_event_council_assignments.event_id
      AND p.id = auth.uid()
      AND (e.cohort_id IS NULL OR e.cohort_id = p.cohort_id)
  ));

-- ── 3. Notification idempotency log ───────────────────────────────────────
CREATE TABLE cohort_event_notifications_sent (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES cohort_events(id) ON DELETE CASCADE,
  kind            text NOT NULL
    CHECK (kind IN ('t50_council', 't30_ordinand', 't3_all')),
  sent_at         timestamptz NOT NULL DEFAULT now(),
  recipient_count integer NOT NULL DEFAULT 0,
  UNIQUE (event_id, kind)
);

CREATE INDEX cohort_event_notifications_sent_event_idx
  ON cohort_event_notifications_sent (event_id);

COMMENT ON TABLE cohort_event_notifications_sent IS
  'One row per (event, kind) the cron has dispatched. UNIQUE(event_id, kind) makes the daily sweep safely idempotent — re-running never double-sends.';

ALTER TABLE cohort_event_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Only admins/server need to see this; service-role bypasses RLS for the cron.
CREATE POLICY "Admins read notification log"
  ON cohort_event_notifications_sent FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'admin' = ANY (profiles.roles)
  ));
