// app/dashboard/council/interview/[id]/page.tsx
// Read-only interview detail view for council members.
// Shows interview date, candidate info, status, council present, and (post-decision) the result.
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'
import { C } from '../../../../../lib/theme'

interface Interview {
  id: string
  ordinand_id: string
  scheduled_date: string | null
  interview_date: string | null
  status: string
  result: string | null
  council_present: string[]
  notes: string
  decision_notes: string
  conducted_by: string | null
  ordination_date: string | null
  officiant: string
  created_at: string
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  email?: string
  mentor_name?: string | null
  cohort_id?: string | null
}

const STATUS_DISPLAY: Record<string, { label: string; badge: string; icon: string }> = {
  scheduled:   { label: 'Scheduled',   badge: 'bg-blue-100 text-blue-700',   icon: '📅' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-100 text-amber-700', icon: '🎙️' },
  decided:     { label: 'Decided',     badge: 'bg-green-100 text-green-700', icon: '✅' },
  cancelled:   { label: 'Cancelled',   badge: 'bg-slate-100 text-slate-500', icon: '✕' },
}

const RESULT_DISPLAY: Record<string, { label: string; colour: string }> = {
  sustained:     { label: 'Sustained',               colour: 'bg-green-50 border-green-300 text-green-800' },
  conditional:   { label: 'Conditionally Sustained',  colour: 'bg-blue-50 border-blue-300 text-blue-800' },
  deferred:      { label: 'Deferred',                colour: 'bg-amber-50 border-amber-300 text-amber-800' },
  not_sustained: { label: 'Not Sustained',            colour: 'bg-red-50 border-red-300 text-red-800' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CouncilInterviewDetailPage() {
  const params = useParams<{ id: string }>()
  const interviewId = params?.id ?? ''
  const router = useRouter()

  const [interview, setInterview] = useState<Interview | null>(null)
  const [ordinand, setOrdinand] = useState<Profile | null>(null)
  const [lead, setLead] = useState<Profile | null>(null)
  const [councilProfiles, setCouncilProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      // Verify caller is council or admin
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()

      const roles: string[] = myProfile?.roles ?? []
      if (!roles.includes('council') && !roles.includes('admin')) {
        setError('You do not have permission to view this page.')
        setLoading(false)
        return
      }

      // Fetch interview (RLS allows council SELECT)
      const { data: iv, error: ivErr } = await supabase
        .from('oral_interviews')
        .select('*')
        .eq('id', interviewId)
        .single()

      if (ivErr || !iv) {
        setError('Interview not found.')
        setLoading(false)
        return
      }
      setInterview(iv)

      // Fetch ordinand profile
      const { data: ord } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, mentor_name, cohort_id')
        .eq('id', iv.ordinand_id)
        .single()
      setOrdinand(ord)

      // Fetch lead interviewer
      if (iv.conducted_by) {
        const { data: leadProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', iv.conducted_by)
          .single()
        setLead(leadProfile)
      }

      // Fetch council member names for the attendance list
      if (iv.council_present && iv.council_present.length > 0) {
        const { data: members } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', iv.council_present)
        setCouncilProfiles(members ?? [])
      }

      setLoading(false)
    }
    load()
  }, [interviewId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="animate-spin text-2xl">⏳</span>
          <span className="font-bold">Loading interview details…</span>
        </div>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 font-bold text-lg">{error || 'Interview not found'}</p>
          <Link href="/dashboard/council" className="text-sm font-bold mt-3 inline-block" style={{ color: C.allianceBlue }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const candidateName = ordinand
    ? `${ordinand.first_name} ${ordinand.last_name}`.trim()
    : 'Unknown'
  const leadName = lead ? `${lead.first_name} ${lead.last_name}`.trim() : null
  const statusCfg = STATUS_DISPLAY[interview.status] ?? STATUS_DISPLAY.scheduled
  const resultCfg = interview.result ? RESULT_DISPLAY[interview.result] : null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/council"
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Council Dashboard
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <h1 className="text-base font-black text-slate-900">Interview Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusCfg.icon}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.badge}`}>
            {statusCfg.label}
          </span>
        </div>
      </header>

      <main className="py-8 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Candidate card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Candidate</p>
              <h2 className="text-2xl font-black" style={{ color: C.deepSea }}>{candidateName}</h2>
              {ordinand?.mentor_name && (
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Mentor: {ordinand.mentor_name}
                </p>
              )}
            </div>
          </div>

          {/* Interview details */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Interview Details</p>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">Scheduled Date</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(interview.scheduled_date)}</p>
                </div>
                {interview.interview_date && interview.interview_date !== interview.scheduled_date && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-1">Actual Date</p>
                    <p className="text-sm font-medium text-slate-700">{formatDate(interview.interview_date)}</p>
                  </div>
                )}
                {leadName && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-1">Lead Interviewer</p>
                    <p className="text-sm font-medium text-slate-700">{leadName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">Status</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.badge}`}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Council attendance */}
          {councilProfiles.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Council Present</p>
              </div>
              <div className="px-8 py-5">
                <div className="flex flex-wrap gap-2">
                  {councilProfiles.map(m => (
                    <span
                      key={m.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0077C8] text-white"
                    >
                      {m.first_name} {m.last_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Decision / Result (only shown when decided) */}
          {interview.status === 'decided' && resultCfg && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Decision</p>
              </div>
              <div className="px-8 py-6 space-y-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-2">Outcome</p>
                  <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold border ${resultCfg.colour}`}>
                    {resultCfg.label}
                  </span>
                </div>

                {interview.decision_notes && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-2">Deliberation Notes</p>
                    <pre className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                      {interview.decision_notes}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  {interview.ordination_date && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 mb-1">Ordination Date</p>
                      <p className="text-sm font-medium text-slate-700">{formatDate(interview.ordination_date)}</p>
                    </div>
                  )}
                  {interview.officiant && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 mb-1">Officiant</p>
                      <p className="text-sm font-medium text-slate-700">{interview.officiant}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Informational note for upcoming interviews */}
          {(interview.status === 'scheduled' || interview.status === 'in_progress') && (
            <div className="bg-blue-50 rounded-2xl border border-blue-200 px-6 py-4 flex items-start gap-3">
              <span className="text-lg shrink-0 mt-0.5">ℹ️</span>
              <div>
                <p className="font-bold text-blue-800 text-sm">
                  {interview.status === 'scheduled'
                    ? 'This interview has not yet taken place.'
                    : 'This interview is currently in progress.'}
                </p>
                <p className="text-blue-600 text-xs font-medium mt-0.5">
                  The decision and details will appear here once the interview is complete.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
