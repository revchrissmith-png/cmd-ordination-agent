// _components/CustomizeTrackModal.tsx
// Admin modal to customize an ordinand's requirement track:
//   • toggle "custom track" flag + edit track notes
//   • waive standard requirements (with reason) or un-waive them
//   • add custom (template-less) requirements with admin-authored title/desc/type
//
// All changes go through POST /api/admin/customize-track in a single request.
'use client'
import { useState } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { inputClass, labelClass, btnPrimary } from '../../../../../../lib/formStyles'
import ModalWrapper from '../../../../../components/ModalWrapper'

type CustomType = 'book_report' | 'paper' | 'sermon' | 'other'

interface Props {
  candidate: any
  requirements: any[]
  isObserver: boolean
  onClose: () => void
  onSaved: () => void
  flash: (text: string, type: 'success' | 'error') => void
}

interface NewCustom { title: string; description: string; type: CustomType }

export default function CustomizeTrackModal({ candidate, requirements, isObserver, onClose, onSaved, flash }: Props) {
  const [isCustomTrack, setIsCustomTrack] = useState<boolean>(!!candidate.is_custom_track)
  const [trackNotes, setTrackNotes]       = useState<string>(candidate.custom_track_notes ?? '')
  const [waiveSelected, setWaiveSelected] = useState<Record<string, string>>({})
  const [unwaiveIds, setUnwaiveIds]       = useState<Set<string>>(new Set())
  const [newReqs, setNewReqs]             = useState<NewCustom[]>([])
  const [isSaving, setIsSaving]           = useState(false)

  const standardReqs = requirements.filter(r => r.status === 'not_started')
  const waivedReqs   = requirements.filter(r => r.status === 'waived')

  function toggleWaive(reqId: string) {
    setWaiveSelected(prev => {
      const next = { ...prev }
      if (reqId in next) delete next[reqId]
      else next[reqId] = ''
      return next
    })
  }

  function setWaiveReason(reqId: string, reason: string) {
    setWaiveSelected(prev => ({ ...prev, [reqId]: reason }))
  }

  function toggleUnwaive(reqId: string) {
    setUnwaiveIds(prev => {
      const next = new Set(prev)
      if (next.has(reqId)) next.delete(reqId)
      else next.add(reqId)
      return next
    })
  }

  function addNewReqRow() {
    setNewReqs(prev => [...prev, { title: '', description: '', type: 'other' }])
  }

  function updateNewReq(idx: number, patch: Partial<NewCustom>) {
    setNewReqs(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function removeNewReq(idx: number) {
    setNewReqs(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return }

    // Validate: every selected waive needs a non-empty reason
    const waivers = Object.entries(waiveSelected)
    for (const [, reason] of waivers) {
      if (!reason.trim()) { flash('Every waived requirement needs a reason.', 'error'); return }
    }
    // Validate new custom requirements
    const validNew = newReqs.filter(r => r.title.trim())
    for (const r of newReqs) {
      if (r.title.trim() && !r.type) { flash('Every custom requirement needs a type.', 'error'); return }
    }

    setIsSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { flash('Not authenticated.', 'error'); setIsSaving(false); return }

    const body = {
      ordinandId: candidate.id,
      setIsCustomTrack: isCustomTrack,
      setNotes: trackNotes.trim() || null,
      addCustom: validNew.map(r => ({ title: r.title.trim(), description: r.description.trim(), type: r.type })),
      waive: waivers.map(([requirementId, reason]) => ({ requirementId, reason: reason.trim() })),
      unwaive: Array.from(unwaiveIds),
    }

    const res = await fetch('/api/admin/customize-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const out = await res.json().catch(() => ({}))
    setIsSaving(false)

    if (!res.ok && res.status !== 207) {
      flash(out.error || 'Failed to save customization.', 'error')
      return
    }
    if (out.errors?.length) {
      flash(`Saved with warnings: ${out.errors.join('; ')}`, 'error')
    } else {
      flash('Track customization saved.', 'success')
    }
    onSaved()
  }

  return (
    <ModalWrapper onClose={onClose} ariaLabel="Customize requirement track" maxWidth="max-w-3xl" innerClassName="max-h-[90vh] overflow-y-auto p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-black text-purple-700 uppercase tracking-widest mb-1">Customize Track</p>
          <h3 className="text-xl font-black text-slate-900">{candidate.first_name} {candidate.last_name}</h3>
          <p className="text-sm text-slate-400 font-medium mt-1">Use sparingly — for ordinands whose path deviates from the standard 17 requirements.</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-black text-xl">&#x2715;</button>
      </div>

      {/* Track flag */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isCustomTrack}
            onChange={e => setIsCustomTrack(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">This ordinand is on a custom track</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">When enabled, this ordinand is excluded from cohort-level requirement regeneration. Their requirements stay exactly as you've curated them.</p>
          </div>
        </label>
        <div className="mt-4">
          <label className={labelClass}>Track Notes (visible to council in the interview brief)</label>
          <textarea
            value={trackNotes}
            onChange={e => setTrackNotes(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="e.g., Previously ordained in another denomination — pursuing equivalency for gap requirements only."
          />
        </div>
      </div>

      {/* Waive existing not_started requirements */}
      {standardReqs.length > 0 && (
        <div>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Waive Existing Requirements</h4>
          <p className="text-xs text-slate-400 font-medium mb-3">Only requirements that haven't been started can be waived. Submitted or graded work is protected.</p>
          <div className="space-y-2">
            {standardReqs.map(req => {
              const checked = req.id in waiveSelected
              const title = req.requirement_templates?.title ?? req.custom_title ?? 'Unknown'
              return (
                <div key={req.id} className={`border rounded-xl p-3 ${checked ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggleWaive(req.id)} className="mt-1 h-4 w-4" />
                    <span className="flex-1 text-sm font-bold text-slate-800">{title}{req.template_id === null && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 uppercase tracking-wider">Custom</span>}</span>
                  </label>
                  {checked && (
                    <input
                      type="text"
                      value={waiveSelected[req.id] || ''}
                      onChange={e => setWaiveReason(req.id, e.target.value)}
                      placeholder="Reason for waiver (required, visible to council)"
                      className={`${inputClass} mt-2`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Un-waive previously waived requirements */}
      {waivedReqs.length > 0 && (
        <div>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Reinstate Waived Requirements</h4>
          <div className="space-y-2">
            {waivedReqs.map(req => {
              const checked = unwaiveIds.has(req.id)
              const title = req.requirement_templates?.title ?? req.custom_title ?? 'Unknown'
              return (
                <label key={req.id} className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer ${checked ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleUnwaive(req.id)} className="mt-1 h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{title}</p>
                    {req.waived_reason && <p className="text-xs text-slate-500 mt-0.5">Was waived: {req.waived_reason}</p>}
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Add new custom requirements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Add Custom Requirements</h4>
          <button onClick={addNewReqRow} className="text-xs font-bold text-purple-700 hover:text-purple-900">+ Add requirement</button>
        </div>
        {newReqs.length === 0 && (
          <p className="text-xs text-slate-400 font-medium">None added yet. Custom requirements can replace or supplement the standard 17.</p>
        )}
        <div className="space-y-3">
          {newReqs.map((r, i) => (
            <div key={i} className="border border-purple-200 bg-purple-50/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Title"
                  value={r.title}
                  onChange={e => updateNewReq(i, { title: e.target.value })}
                  className={inputClass}
                />
                <select
                  value={r.type}
                  onChange={e => updateNewReq(i, { type: e.target.value as CustomType })}
                  className={inputClass}
                  style={{ maxWidth: '12rem' }}
                >
                  <option value="book_report">Book Report</option>
                  <option value="paper">Paper</option>
                  <option value="sermon">Sermon</option>
                  <option value="other">Other</option>
                </select>
                <button onClick={() => removeNewReq(i)} className="text-slate-400 hover:text-red-600 font-black px-2">&#x2715;</button>
              </div>
              <textarea
                placeholder="Description / instructions for the ordinand"
                value={r.description}
                onChange={e => updateNewReq(i, { description: e.target.value })}
                rows={3}
                className={inputClass}
              />
              {r.type === 'other' && (
                <p className="text-xs text-amber-700 font-medium">Type "other" has no automatic grader pool — you'll need to assign a grader manually.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2">Cancel</button>
        <button
          onClick={handleSave}
          disabled={isSaving || isObserver}
          className={btnPrimary}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </ModalWrapper>
  )
}
