// _components/GradeModal.tsx
// Grade assignment modal — extracted from candidates/[id]/page.tsx
'use client'
import { useState } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { RATING_LABELS, type Rating, type Status } from '../../../../../../lib/theme'
import { inputClass, labelClass, btnPrimary } from '../../../../../../lib/formStyles'
import ModalWrapper from '../../../../../components/ModalWrapper'

interface GradeModalProps {
  req: any
  candidate: any
  councilMembers: any[]
  initialRating: Rating | ''
  initialComments: string
  isObserver: boolean
  onClose: () => void
  onSaved: () => void
  flash: (text: string, type: 'success' | 'error') => void
}

export default function GradeModal({ req, candidate, councilMembers, initialRating, initialComments, isObserver, onClose, onSaved, flash }: GradeModalProps) {
  const [rating, setRating] = useState<Rating | ''>(initialRating)
  const [comments, setComments] = useState(initialComments)
  const [modalGraderId, setModalGraderId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveGrade() {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return }
    if (!req || !rating) return
    setIsSaving(true)
    const gaId = Array.isArray(req.grading_assignments) ? req.grading_assignments[0]?.id : req.grading_assignments?.id
    const submission = Array.isArray(req.submissions) ? req.submissions[0] : req.submissions
    if (!submission?.id) { flash('No submission found to grade.', 'error'); setIsSaving(false); return }
    const { data: currentUser } = await supabase.auth.getUser()
    const gradedBy = modalGraderId || currentUser.user?.id

    // grading_assignment_id is NOT NULL in grades — always ensure one exists
    let resolvedGaId = gaId
    if (modalGraderId && gaId) {
      // Update existing assignment to the chosen grader
      await supabase.from('grading_assignments').update({ council_member_id: modalGraderId, reassigned_at: new Date().toISOString() }).eq('id', gaId)
    } else if (!resolvedGaId || modalGraderId) {
      // Create a new assignment (either no existing one, or a specific grader was chosen)
      const { data: newGa } = await supabase.from('grading_assignments').insert({
        ordinand_requirement_id: req.id,
        council_member_id: gradedBy,
        assigned_by: currentUser.user?.id,
      }).select('id').single()
      resolvedGaId = newGa?.id
    }

    if (!resolvedGaId) { flash('Could not create grading assignment.', 'error'); setIsSaving(false); return }

    const { error: gradeError } = await supabase.from('grades').upsert(
      { submission_id: submission.id, grading_assignment_id: resolvedGaId, overall_rating: rating, overall_comments: comments, graded_by: gradedBy, graded_at: new Date().toISOString() },
      { onConflict: 'submission_id' }
    )
    if (gradeError) { flash('Error saving grade: ' + gradeError.message, 'error'); setIsSaving(false); return }
    const newStatus: Status = rating === 'insufficient' ? 'revision_required' : 'complete'
    await supabase.from('ordinand_requirements').update({ status: newStatus }).eq('id', req.id)
    flash('Grade saved.', 'success')
    setIsSaving(false)
    onSaved()
  }

  function handleClose() {
    onClose()
  }

  return (
    <ModalWrapper onClose={onClose} ariaLabel="Grade assignment" maxWidth="max-w-lg" innerClassName="p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Grade Assignment</p>
            <h3 className="text-xl font-black text-slate-900">{req.requirement_templates?.title ?? req.custom_title}</h3>
            <p className="text-sm text-slate-400 font-medium mt-1">{candidate.first_name} {candidate.last_name}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 font-black text-xl transition-colors"
          >&#x2715;</button>
        </div>
        <div>
          <label className={labelClass}>Graded By</label>
          <select
            className={inputClass}
            value={modalGraderId}
            onChange={e => setModalGraderId(e.target.value)}
          >
            <option value="">Select council member...</option>
            {councilMembers.map(m => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 font-medium mt-1">Required for migration. Leave blank to record as your own grade.</p>
        </div>
        <div>
          <label className={labelClass}>Rating</label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(RATING_LABELS) as Rating[]).map(r => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border-2 ${rating === r ? (r === 'insufficient' ? 'bg-red-500 text-white border-red-500' : 'bg-blue-600 text-white border-blue-600') : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
              >
                {RATING_LABELS[r]}
              </button>
            ))}
          </div>
          {rating === 'insufficient' && <p className="text-xs text-red-500 font-bold mt-2">&#x26A0; Insufficient will mark this as Revision Required</p>}
          {rating && rating !== 'insufficient' && <p className="text-xs text-green-600 font-bold mt-2">&#x2713; This rating will mark the assignment as Complete</p>}
        </div>
        <div>
          <label className={labelClass}>Feedback Comments</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={4}
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Provide feedback for the ordinand..."
          />
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveGrade} disabled={!rating || isSaving} className={btnPrimary}>
            {isSaving ? 'Saving...' : 'Save Grade'}
          </button>
          <button
            onClick={handleClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
    </ModalWrapper>
  )
}
