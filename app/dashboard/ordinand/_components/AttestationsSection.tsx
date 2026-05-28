// app/dashboard/ordinand/_components/AttestationsSection.tsx
// Personal-pledge attestations for the two non-graded ordination
// requirements (Alliance Canada manual, whole-Bible-new-translation).
//
// Visual weight: parchment-tinted card, signature script, "Before God
// and the Ordaining Council" pledge language. The intent is for the
// ordinand to feel they are signing something, not ticking a box.
//
// Once attested, the row shows the signed name, the date, and a note
// that the pledge is permanent from the ordinand's side. Admin-cleared
// resets it via /api/admin/attestations/clear.
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabase/client'
import { C } from '../../../../lib/theme'
import {
  ATTESTATION_KINDS,
  ATTESTATION_TITLE,
  ATTESTATION_SUMMARY,
  ATTESTATION_TEXT,
  type AttestationKind,
} from '../../../../lib/attestations'

type AttestationRow = {
  id:               string
  kind:             AttestationKind
  signature_name:   string
  attested_at:      string
  attestation_text: string
}

type Props = {
  profileId:   string
  fullName:    string | null
  isViewAs:    boolean
}

export default function AttestationsSection({ profileId, fullName, isViewAs }: Props) {
  const [rows, setRows] = useState<AttestationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openKind, setOpenKind] = useState<AttestationKind | null>(null)

  useEffect(() => {
    if (!profileId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('ordinand_attestations')
      .select('id, kind, signature_name, attested_at, attestation_text')
      .eq('profile_id', profileId)
    setRows((data ?? []) as AttestationRow[])
    setLoading(false)
  }

  const byKind = (k: AttestationKind) => rows.find(r => r.kind === k)

  return (
    <div className="mt-12 mb-4">
      <div className="flex items-center gap-3 mb-3 px-1">
        <span className="text-xl">✒️</span>
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Personal Attestations</h2>
        <span className="text-xs font-medium text-slate-400 hidden md:inline">— two requirements that are pledges, not assignments</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ATTESTATION_KINDS.map(kind => {
          const row = byKind(kind)
          return (
            <AttestationCard
              key={kind}
              kind={kind}
              attestation={row}
              loading={loading}
              isViewAs={isViewAs}
              onClickAttest={() => setOpenKind(kind)}
            />
          )
        })}
      </div>

      {openKind && !isViewAs && (
        <AttestationModal
          kind={openKind}
          defaultName={fullName ?? ''}
          onClose={() => setOpenKind(null)}
          onAttested={async () => {
            setOpenKind(null)
            await load()
          }}
        />
      )}
    </div>
  )
}

function AttestationCard({
  kind,
  attestation,
  loading,
  isViewAs,
  onClickAttest,
}: {
  kind:          AttestationKind
  attestation?:  AttestationRow
  loading:       boolean
  isViewAs:      boolean
  onClickAttest: () => void
}) {
  const signed = !!attestation

  return (
    <div
      className={`rounded-2xl p-5 transition-all border ${
        signed
          ? 'border-amber-300'
          : 'border-slate-200 hover:border-slate-300'
      }`}
      style={signed
        ? { background: 'linear-gradient(180deg, #fdf6e3 0%, #faf0d4 100%)' }
        : { background: '#ffffff' }
      }
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">📜</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold leading-snug" style={{ color: C.deepSea }}>
            {ATTESTATION_TITLE[kind]}
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {ATTESTATION_SUMMARY[kind]}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200/70">
        {loading ? (
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
        ) : signed ? (
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-700/80 mb-1">Attested</div>
            <div className="font-bold text-slate-800" style={{ fontFamily: '"Snell Roundhand", "Apple Chancery", "Lucida Handwriting", cursive', fontSize: '20px', letterSpacing: '0.02em' }}>
              {attestation!.signature_name}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {new Date(attestation!.attested_at).toLocaleDateString('en-CA', {
                timeZone: 'America/Regina',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="text-[11px] text-slate-400 italic mt-2">
              This attestation is permanent from your side. If it was made in error, your administrator can clear it.
            </div>
          </div>
        ) : isViewAs ? (
          <div className="text-sm text-slate-400 italic">Not yet attested.</div>
        ) : (
          <button
            type="button"
            onClick={onClickAttest}
            className="w-full py-2.5 rounded-xl font-bold text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Read & sign attestation →
          </button>
        )}
      </div>
    </div>
  )
}

function AttestationModal({
  kind,
  defaultName,
  onClose,
  onAttested,
}: {
  kind:         AttestationKind
  defaultName:  string
  onClose:      () => void
  onAttested:   () => void
}) {
  const [signature, setSignature] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expected = defaultName.trim()
  const trimmed = signature.trim()
  // Loose match: case-insensitive equality after collapsing whitespace.
  // This forgives "John  Smith" → "john smith" but won't accept "JS".
  const matches = expected.length > 0
    && trimmed.length > 0
    && trimmed.toLowerCase().replace(/\s+/g, ' ') === expected.toLowerCase().replace(/\s+/g, ' ')

  async function submit() {
    if (!matches || !confirmed) return
    setSubmitting(true)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ordinand/attestations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ kind, signature_name: trimmed }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error ?? 'Submission failed.')
      setSubmitting(false)
      return
    }
    onAttested()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div
          className="p-6 md:p-8 border-b border-amber-200/70"
          style={{ background: 'linear-gradient(180deg, #fdf6e3 0%, #faf0d4 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📜</span>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-700/80">Personal Attestation</div>
              <h2 className="text-xl font-black mt-0.5" style={{ color: C.deepSea }}>{ATTESTATION_TITLE[kind]}</h2>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-5">
          <div className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line border-l-4 border-amber-300 pl-4 italic">
            {ATTESTATION_TEXT[kind]}
          </div>

          <div className="pt-2">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              Sign with your full name
            </label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder={expected || 'Your full name'}
              autoComplete="off"
              className="w-full px-4 py-4 bg-white border-b-2 border-slate-300 focus:border-amber-500 outline-none text-slate-800"
              style={{ fontFamily: '"Snell Roundhand", "Apple Chancery", "Lucida Handwriting", cursive', fontSize: '24px', letterSpacing: '0.02em' }}
            />
            {expected.length > 0 && (
              <p className={`text-xs mt-2 ${matches ? 'text-emerald-700' : 'text-slate-500'}`}>
                {matches
                  ? '✓ Signature matches the name on your account.'
                  : `Type your name as it appears on your profile: "${expected}"`}
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              I have read the attestation above. I understand that this pledge is permanent from my side and that no further verification will be sought.
            </span>
          </label>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-sm font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!matches || !confirmed || submitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:bg-slate-300"
          >
            {submitting ? 'Recording…' : 'Sign & record attestation'}
          </button>
        </div>
      </div>
    </div>
  )
}
