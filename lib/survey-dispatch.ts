// lib/survey-dispatch.ts
// Single-source dispatcher: given a survey id, create per-attendee
// invitations and send the emails. Idempotent — survey rows with sent_at
// already set are skipped; invitations that already exist are reused.
//
// Used by both the "Send now" admin action and the hourly cron sweep.
import { randomBytes } from 'crypto'
import { serviceClient } from './api-auth'
import { EMAIL_FROM, SITE_URL, SITE_DOMAIN } from './config'
import { wrapEmail, emailButton } from './email-templates'
import { sendMany, type EmailPayload } from './resend-send'

const DEEP_SEA = '#00426A'

export type DispatchResult =
  | { ok: true;  invited: number; sent: number; failed: number; already_sent?: boolean }
  | { ok: false; error: string }

/** URL-safe random token (~22 chars) for invitation links. */
function newToken(): string {
  return randomBytes(16).toString('base64url')
}

function buildEmail(opts: {
  recipientName: string
  surveyTitle:   string
  eventTitle:    string
  eventDate:     string
  surveyUrl:     string
  closesAt:      string | null
}): string {
  const { recipientName, surveyTitle, eventTitle, eventDate, surveyUrl, closesAt } = opts
  const closeLine = closesAt
    ? `<p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">The survey closes ${closesAt}.</p>`
    : ''
  const body = `
    <p style="color:#1e293b;font-size:15px;margin:0 0 20px;">Hi ${recipientName.split(' ')[0] || recipientName},</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Thanks for being part of <strong>${eventTitle}</strong> on ${eventDate}.
      We’d love your honest feedback — five minutes, mostly checkboxes, and
      an "anonymous" toggle at the bottom if you’d rather your name not be
      attached.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
      Your answers help us decide whether days like this are worth doing
      more often and what shape they should take.
    </p>
    ${emailButton(surveyUrl, 'Open the Survey →')}
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">If the button above doesn’t work, copy this link into your browser:</p>
    <p style="color:#0077C8;font-size:12px;word-break:break-all;margin:0 0 16px;">${surveyUrl}</p>
    ${closeLine}
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">This link is personal to you. Submitting closes it.</p>
  `
  return wrapEmail(body)
}

/** Format a UTC instant as Regina wall-clock long date (e.g. "May 27, 2026"). */
function formatLongDateRegina(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    timeZone: 'America/Regina',
    weekday:  'long',
    year:     'numeric',
    month:    'long',
    day:      'numeric',
  })
}

/** Format an event_date column (YYYY-MM-DD, no time) as a long date. */
function formatLongDateFromDateOnly(d: string): string {
  // Anchor at noon Regina to dodge the UTC-midnight-rolls-back-a-day trap.
  return new Date(`${d}T12:00:00-06:00`).toLocaleDateString('en-CA', {
    timeZone: 'America/Regina',
    weekday:  'long',
    year:     'numeric',
    month:    'long',
    day:      'numeric',
  })
}

export async function dispatchSurvey(surveyId: string): Promise<DispatchResult> {
  // 1. Fetch survey
  const { data: survey, error: surveyErr } = await serviceClient
    .from('cohort_event_surveys')
    .select('id, event_id, title, sent_at, closes_at')
    .eq('id', surveyId)
    .single()
  if (surveyErr || !survey) {
    return { ok: false, error: `Survey not found: ${surveyErr?.message ?? 'no row'}` }
  }
  if (survey.sent_at) {
    return { ok: true, invited: 0, sent: 0, failed: 0, already_sent: true }
  }

  // 2. Fetch event for the email
  const { data: ev } = await serviceClient
    .from('cohort_events')
    .select('id, title, event_date')
    .eq('id', survey.event_id)
    .single()
  if (!ev) {
    return { ok: false, error: 'Event not found' }
  }

  // 3. Build invitation rows for every attendee not yet invited
  const { data: attendance } = await serviceClient
    .from('cohort_event_attendance')
    .select('profile_id')
    .eq('event_id', survey.event_id)
    .eq('attended', true)
  const attendeeIds = (attendance ?? []).map(r => r.profile_id as string)
  if (attendeeIds.length === 0) {
    return { ok: false, error: 'No attendees marked' }
  }

  const { data: existing } = await serviceClient
    .from('cohort_event_survey_invitations')
    .select('profile_id, token, sent_at')
    .eq('survey_id', surveyId)
  const existingByProfile = new Map(
    (existing ?? []).map(r => [r.profile_id as string, r as any]),
  )

  const toCreate = attendeeIds
    .filter(pid => !existingByProfile.has(pid))
    .map(pid => ({ survey_id: surveyId, profile_id: pid, token: newToken() }))
  if (toCreate.length > 0) {
    const { error: insErr } = await serviceClient
      .from('cohort_event_survey_invitations')
      .insert(toCreate)
    if (insErr) {
      return { ok: false, error: `Invitation insert failed: ${insErr.message}` }
    }
  }

  // 4. Re-fetch full invitation list (we now have tokens for everyone)
  const { data: allInvites, error: allErr } = await serviceClient
    .from('cohort_event_survey_invitations')
    .select('id, profile_id, token, sent_at')
    .eq('survey_id', surveyId)
  if (allErr || !allInvites) {
    return { ok: false, error: `Re-fetch failed: ${allErr?.message ?? 'no rows'}` }
  }

  // 5. Pull profile names/emails
  const profileIds = allInvites.map(r => r.profile_id)
  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, full_name, first_name, last_name, email')
    .in('id', profileIds)
  const profileById = new Map((profiles ?? []).map(p => [p.id as string, p as any]))

  // 6. Build payloads — skip invitations already sent
  const eventDateStr = formatLongDateFromDateOnly(ev.event_date)
  const closesAtStr  = survey.closes_at
    ? formatLongDateRegina(survey.closes_at)
    : null

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY not configured' }

  const toSend: { invitationId: string; payload: EmailPayload }[] = []
  for (const inv of allInvites) {
    if (inv.sent_at) continue
    const p = profileById.get(inv.profile_id)
    if (!p?.email) continue
    const recipientName = (p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()) || 'friend'
    const surveyUrl     = `${SITE_URL}/survey/${inv.token}`
    toSend.push({
      invitationId: inv.id,
      payload: {
        from:    EMAIL_FROM,
        to:      [`${recipientName} <${p.email}>`],
        subject: `Your feedback on ${ev.title}`,
        html:    buildEmail({
          recipientName,
          surveyTitle: survey.title,
          eventTitle:  ev.title,
          eventDate:   eventDateStr,
          surveyUrl,
          closesAt:    closesAtStr,
        }),
      },
    })
  }

  if (toSend.length === 0) {
    // Everyone already sent — just mark survey done if not already.
    await serviceClient
      .from('cohort_event_surveys')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', surveyId)
    return { ok: true, invited: allInvites.length, sent: 0, failed: 0 }
  }

  const results = await sendMany(toSend.map(t => t.payload), resendKey)

  let sentCount = 0
  let failedCount = 0
  const nowIso = new Date().toISOString()
  for (let i = 0; i < results.length; i++) {
    if (results[i].ok) {
      sentCount++
      await serviceClient
        .from('cohort_event_survey_invitations')
        .update({ sent_at: nowIso })
        .eq('id', toSend[i].invitationId)
    } else {
      failedCount++
      console.error(
        '[dispatchSurvey] send failed for invitation',
        toSend[i].invitationId,
        results[i],
      )
    }
  }

  // 7. Mark survey itself as sent if we got at least one out
  if (sentCount > 0) {
    await serviceClient
      .from('cohort_event_surveys')
      .update({ sent_at: nowIso })
      .eq('id', surveyId)
  }

  return { ok: true, invited: allInvites.length, sent: sentCount, failed: failedCount }
}
