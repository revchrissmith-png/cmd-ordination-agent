-- Event attendance + post-event feedback surveys.
--
-- Driven by the 2026-05-27 Intercultural Fluency in-person gathering, where
-- the district wants to ask attendees whether days like this are worth doing
-- more often and what shape they should take.
--
-- Four tables:
--
--   1. cohort_event_attendance — who actually showed up at an event. The
--      invited universe for an in-person gathering with no cohort scoping
--      is "all active ordinands"; admin marks who attended in a checklist.
--
--   2. cohort_event_surveys — one survey per event (1:1 in practice but we
--      keep the FK soft to allow follow-up surveys later). Questions stored
--      as JSONB on the row so historical surveys stay frozen even if the
--      seed template in code changes.
--
--   3. cohort_event_survey_invitations — one row per attendee × survey,
--      with a unique opaque token used in the email link. Token-gated, not
--      login-gated, so an "anonymous" submission can still verify the
--      attendee was actually invited.
--
--   4. cohort_event_survey_responses — submitted answers. profile_id is
--      NULL and anonymous=true when the attendee opted to submit anonymously;
--      the invitation_id link is also dropped in that case so the response
--      can't be back-mapped via the invitation token.

-- ── 1. Attendance check-off ───────────────────────────────────────────────
CREATE TABLE cohort_event_attendance (
  event_id    uuid NOT NULL REFERENCES cohort_events(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  attended    boolean NOT NULL DEFAULT false,
  marked_by   uuid REFERENCES profiles(id),
  marked_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);

CREATE INDEX cohort_event_attendance_event_idx
  ON cohort_event_attendance (event_id);

COMMENT ON TABLE cohort_event_attendance IS
  'Per-attendee attendance flag for a cohort_event. Pre-seeded with all active ordinands when the admin opens the attendance page; admin toggles attended=true for those who actually showed up.';

ALTER TABLE cohort_event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attendance"
  ON cohort_event_attendance FOR ALL
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

CREATE POLICY "Council reads attendance"
  ON cohort_event_attendance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'council' = ANY (profiles.roles)
  ));

CREATE POLICY "Ordinands read their own attendance"
  ON cohort_event_attendance FOR SELECT
  USING (profile_id = auth.uid());

-- ── 2. Survey definitions ────────────────────────────────────────────────
CREATE TABLE cohort_event_surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES cohort_events(id) ON DELETE CASCADE,
  title       text NOT NULL,
  intro       text,
  questions   jsonb NOT NULL,
  opens_at    timestamptz NOT NULL DEFAULT now(),
  closes_at   timestamptz,
  send_at     timestamptz,
  sent_at     timestamptz,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cohort_event_surveys_event_idx
  ON cohort_event_surveys (event_id);

CREATE INDEX cohort_event_surveys_send_at_idx
  ON cohort_event_surveys (send_at)
  WHERE sent_at IS NULL AND send_at IS NOT NULL;

COMMENT ON TABLE cohort_event_surveys IS
  'A feedback survey attached to a cohort_event. questions is the frozen JSONB question list, copied from a versioned seed in lib/surveys/* at creation time so the form is reproducible from the DB alone. send_at is the scheduled dispatch time (cron sweeps for due rows); sent_at is set once the dispatch endpoint has fired.';

COMMENT ON COLUMN cohort_event_surveys.questions IS
  'Array of question objects: { id, type: "scale"|"single"|"multi"|"text", prompt, options?, scale_min?, scale_max?, scale_labels?, required }';

ALTER TABLE cohort_event_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage surveys"
  ON cohort_event_surveys FOR ALL
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

CREATE POLICY "Council reads surveys"
  ON cohort_event_surveys FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'council' = ANY (profiles.roles)
  ));

-- ── 3. Per-attendee invitations (tokenised) ──────────────────────────────
CREATE TABLE cohort_event_survey_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     uuid NOT NULL REFERENCES cohort_event_surveys(id) ON DELETE CASCADE,
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE,
  sent_at       timestamptz,
  opened_at     timestamptz,
  submitted_at  timestamptz,
  UNIQUE (survey_id, profile_id)
);

CREATE INDEX cohort_event_survey_invitations_survey_idx
  ON cohort_event_survey_invitations (survey_id);

CREATE INDEX cohort_event_survey_invitations_token_idx
  ON cohort_event_survey_invitations (token);

COMMENT ON TABLE cohort_event_survey_invitations IS
  'Per-attendee invitation row. token is the opaque secret embedded in the email link, used by /survey/[token] to authenticate the submission without a logged-in session (so anonymous submits still gate by invitation). One row is created for each attendee with attended=true at the moment the survey is dispatched.';

ALTER TABLE cohort_event_survey_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations"
  ON cohort_event_survey_invitations FOR ALL
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

CREATE POLICY "Council reads invitations"
  ON cohort_event_survey_invitations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'council' = ANY (profiles.roles)
  ));

-- The token-gated /survey/[token] page uses the service role to look up
-- invitations, so we don't need a public-readable RLS policy here.

-- ── 4. Responses ─────────────────────────────────────────────────────────
CREATE TABLE cohort_event_survey_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     uuid NOT NULL REFERENCES cohort_event_surveys(id) ON DELETE CASCADE,
  invitation_id uuid REFERENCES cohort_event_survey_invitations(id) ON DELETE SET NULL,
  profile_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  anonymous     boolean NOT NULL DEFAULT false,
  answers       jsonb NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),

  -- Anonymous responses must not carry identifying joins. Identified ones
  -- must. This keeps the "I chose anonymous" promise enforceable at the DB.
  CHECK (
    (anonymous = true  AND profile_id IS NULL AND invitation_id IS NULL)
    OR
    (anonymous = false AND profile_id IS NOT NULL AND invitation_id IS NOT NULL)
  )
);

CREATE INDEX cohort_event_survey_responses_survey_idx
  ON cohort_event_survey_responses (survey_id);

CREATE INDEX cohort_event_survey_responses_invitation_idx
  ON cohort_event_survey_responses (invitation_id)
  WHERE invitation_id IS NOT NULL;

COMMENT ON TABLE cohort_event_survey_responses IS
  'Submitted survey responses. When anonymous=true, profile_id and invitation_id are both NULL by CHECK constraint so the row can never be back-mapped to an attendee through this table. The invitation row is still marked submitted_at by the submit endpoint to prevent double-submission, which is the only residual signal — acceptable, because the attendee chose to participate.';

ALTER TABLE cohort_event_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read responses"
  ON cohort_event_survey_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'admin' = ANY (profiles.roles)
  ));

CREATE POLICY "Council reads responses"
  ON cohort_event_survey_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND 'council' = ANY (profiles.roles)
  ));

-- Writes go through the service-role submit endpoint, not authenticated
-- clients, so no INSERT policy is granted here.
