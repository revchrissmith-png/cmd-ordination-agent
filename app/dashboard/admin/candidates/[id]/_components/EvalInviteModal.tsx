// _components/EvalInviteModal.tsx
// Send external evaluation invitation modal — extracted from candidates/[id]/page.tsx
'use client'
import { useState } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { inputClass, labelClass } from '../../../../../../lib/formStyles'
import { SITE_DOMAIN, ORG_NAME, ORG_PARENT } from '../../../../../../lib/config'
import ModalWrapper from '../../../../../components/ModalWrapper'

interface EvalInviteModalProps {
  type: 'mentor' | 'church'
  initialName: string
  initialEmail: string
  candidate: any
  ordinandId: string
  isObserver: boolean
  onClose: () => void
  onSent: () => void
  flash: (text: string, type: 'success' | 'error') => void
}

export default function EvalInviteModal({ type, initialName, initialEmail, candidate, ordinandId, isObserver, onClose, onSent, flash }: EvalInviteModalProps) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [isSending, setIsSending] = useState(false)

  async function handleSend() {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return }
    if (!name.trim() || !email.trim()) {
      flash('Recipient name and email address are required.', 'error')
      return
    }
    setIsSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { flash('Session expired — please refresh.', 'error'); setIsSending(false); return }

    try {
      const res = await fetch('/api/admin/send-evaluation-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ordinandId,
          ordinandName: `${candidate.first_name} ${candidate.last_name}`,
          evalType: type,
          recipientName: name.trim(),
          recipientEmail: email.trim().toLowerCase(),
        }),
      })
      const result = await res.json()
      if (!res.ok) { flash('Error: ' + result.error, 'error') }
      else {
        flash(`${type === 'mentor' ? 'Mentor' : 'Church board'} evaluation invitation sent to ${name}.`, 'success')
        onSent()
      }
    } catch {
      flash('Network error — please check your connection and try again.', 'error')
    }
    setIsSending(false)
  }

  const typeLabel = type === 'mentor' ? 'Mentor Evaluation' : 'Church Board Evaluation'

  return (
    <ModalWrapper onClose={onClose} ariaLabel={`Send ${typeLabel} invitation`}>
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-start">
          <div>
            <p className="text-xs font-black text-[#0077C8] uppercase tracking-widest mb-1">{typeLabel}</p>
            <h3 className="text-lg font-black text-slate-900">Send Invitation</h3>
            <p className="text-sm text-slate-400 font-medium mt-0.5">{candidate?.first_name} {candidate?.last_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-black text-xl mt-1">&#x2715;</button>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Recipient fields */}
          <div>
            <label className={labelClass}>
              {type === 'mentor' ? 'Mentor Name' : 'Recipient Name'}
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
            />
            {type === 'mentor' && !candidate?.mentor_name && (
              <p className="text-xs text-amber-600 font-medium mt-1">&#x26A0; No mentor name on file — add it in the profile section above.</p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              {type === 'mentor' ? 'Mentor Email Address' : 'Recipient Email Address'}
            </label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
            {type === 'mentor' && !candidate?.mentor_email && (
              <p className="text-xs text-amber-600 font-medium mt-1">&#x26A0; No mentor email on file — add it in the profile section above.</p>
            )}
          </div>

          {/* Email preview */}
          <div>
            <label className={labelClass}>Email Preview</label>
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-sm">
              {/* Preview header */}
              <div style={{ background: '#00426A', borderBottom: '3px solid #0077C8', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/cmd-logo.png" style={{ height: '24px' }} alt="CMD" />
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.05em' }}>CMD ORDINATION PORTAL</span>
              </div>
              {/* Preview body */}
              <div className="p-5 bg-white space-y-3 text-slate-600 leading-relaxed">
                <p>Dear <strong className="text-slate-800">{name || '[Recipient Name]'}</strong>,</p>
                <p className="text-xs">
                  {type === 'mentor'
                    ? 'You are receiving this message because you have been serving as the ministry mentor for '
                    : 'You are receiving this message as a representative of the Board of Elders for the church where '
                  }
                  <strong className="text-slate-800">{candidate?.first_name} {candidate?.last_name}</strong>
                  {type === 'mentor' ? '.' : ' serves in ministry.'}
                </p>
                <p className="text-xs">
                  As {candidate?.first_name} approaches the final stage of the ordination process with the Canadian Midwest District,
                  the Ordaining Council is gathering evaluations from those who know them best in ministry context.
                  Your honest and thoughtful response is an important part of this process.
                </p>
                <div className="py-1">
                  <span className="inline-block bg-[#00426A] text-white px-5 py-2.5 rounded-lg font-bold text-xs">Complete the Evaluation &rarr;</span>
                </div>
                <p className="text-xs text-slate-400">This link is personal to you and expires after a single submission. The form takes approximately 15&ndash;20 minutes to complete.</p>
              </div>
              {/* Preview footer */}
              <div className="bg-slate-50 border-t border-slate-200 py-3 px-5 text-center">
                <p className="text-xs text-slate-400">{ORG_NAME} &middot; {ORG_PARENT} &middot; {SITE_DOMAIN}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSend}
              disabled={isSending || !name.trim() || !email.trim()}
              className="px-6 py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: isSending ? '#aaa' : '#00426A', cursor: isSending ? 'not-allowed' : 'pointer' }}
            >
              {isSending ? 'Sending...' : 'Send Invitation'}
            </button>
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 transition-colors">
              Cancel
            </button>
          </div>
        </div>
    </ModalWrapper>
  )
}
