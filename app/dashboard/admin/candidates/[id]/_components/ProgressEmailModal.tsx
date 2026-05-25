// _components/ProgressEmailModal.tsx
// "Send Progress Update" modal — replaces the legacy mailto: handoff.
//
// Shows a live preview of the branded portal email (built from the same
// lib/progress-email.ts builder the API route uses) and lets the admin
// add free-text comments that appear in a highlighted block. On send,
// POSTs to /api/admin/send-progress-update which ships via Resend with
// Reply-To pointed at the admin's own address.
'use client'
import { useMemo, useState } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { labelClass } from '../../../../../../lib/formStyles'
import ModalWrapper from '../../../../../components/ModalWrapper'
import { wrapEmail } from '../../../../../../lib/email-templates'
import {
  buildProgressEmailBody,
  buildProgressEmailSubject,
  type ProgressEmailRequirement,
} from '../../../../../../lib/progress-email'

interface ProgressEmailModalProps {
  candidate:    any
  requirements: ProgressEmailRequirement[]
  isObserver:   boolean
  onClose:      () => void
  onSent:       () => void
  flash:        (text: string, type: 'success' | 'error') => void
}

export default function ProgressEmailModal({
  candidate,
  requirements,
  isObserver,
  onClose,
  onSent,
  flash,
}: ProgressEmailModalProps) {
  const [extraComments, setExtraComments] = useState('')
  const [isSending,     setIsSending]     = useState(false)

  const cohortLabel = candidate?.cohorts
    ? `${candidate.cohorts.season} ${candidate.cohorts.year}`
    : 'Unknown cohort'
  const cohortDueDate: string | null = candidate?.cohorts?.assignment_due_date ?? null

  const subject = useMemo(
    () => buildProgressEmailSubject({ firstName: candidate.first_name, lastName: candidate.last_name }),
    [candidate.first_name, candidate.last_name],
  )

  // Rebuild on every comments keystroke so the preview matches what ships.
  const previewHtml = useMemo(
    () => wrapEmail(buildProgressEmailBody({
      firstName:    candidate.first_name,
      lastName:     candidate.last_name,
      cohortLabel,
      cohortDueDate,
      requirements,
      extraComments,
    })),
    [candidate.first_name, candidate.last_name, cohortLabel, cohortDueDate, requirements, extraComments],
  )

  async function handleSend() {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return }
    if (!candidate?.email) { flash('Ordinand has no email address on file.', 'error'); return }
    setIsSending(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { flash('Session expired — please refresh.', 'error'); setIsSending(false); return }

    try {
      const res = await fetch('/api/admin/send-progress-update', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ordinandId:    candidate.id,
          extraComments: extraComments.trim() || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok || !result.sent) {
        flash(`Error sending: ${result.reason || result.detail || 'unknown error'}`, 'error')
      } else {
        flash(`Progress update sent to ${candidate.first_name} ${candidate.last_name}.`, 'success')
        onSent()
      }
    } catch {
      flash('Network error — please check your connection and try again.', 'error')
    }
    setIsSending(false)
  }

  return (
    <ModalWrapper onClose={onClose} ariaLabel="Send progress update email">
      <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-start">
        <div>
          <p className="text-xs font-black text-[#0077C8] uppercase tracking-widest mb-1">Progress Update</p>
          <h3 className="text-lg font-black text-slate-900">Send Email to Ordinand</h3>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            {candidate?.first_name} {candidate?.last_name} &middot; {candidate?.email || 'no email on file'}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-black text-xl mt-1">&#x2715;</button>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Subject (read-only) */}
        <div>
          <label className={labelClass}>Subject</label>
          <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 font-medium">
            {subject}
          </div>
        </div>

        {/* Routing summary */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-900 leading-relaxed">
          Sent from the portal's noreply address, signed by the CMD Ordaining Council. Includes a pace banner that mirrors the dashboard's "Ordinands at Risk" tier (green / amber / red) plus the required reqs-per-month to finish on time.
        </div>

        {/* Extra comments */}
        <div>
          <label className={labelClass}>Additional comments (optional)</label>
          <textarea
            className="w-full min-h-[110px] px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400"
            value={extraComments}
            onChange={e => setExtraComments(e.target.value)}
            placeholder="Anything you'd like to add for this ordinand — encouragement, a specific next step, context on a revision. Blank lines split paragraphs."
          />
          <p className="text-xs text-slate-400 mt-1">Appears as a highlighted "note from the council" block in the email.</p>
        </div>

        {/* Live preview */}
        <div>
          <label className={labelClass}>Preview</label>
          <div
            className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-[420px] overflow-y-auto"
            // Preview HTML is built locally from the same lib used server-side —
            // no network round-trip, no foreign content.
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSend}
            disabled={isSending || !candidate?.email}
            className="px-6 py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: isSending ? '#aaa' : '#00426A', cursor: isSending ? 'not-allowed' : 'pointer' }}
          >
            {isSending ? 'Sending…' : '📧 Send Email'}
          </button>
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}
