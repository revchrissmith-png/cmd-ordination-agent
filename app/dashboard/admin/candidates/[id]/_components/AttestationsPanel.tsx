// app/dashboard/admin/candidates/[id]/_components/AttestationsPanel.tsx
// Admin view of an ordinand's personal-pledge attestations + a clear
// action. Clearing deletes the row, which makes the slot available for
// the ordinand to re-attest.
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../../../utils/supabase/client'
import { C } from '../../../../../../lib/theme'
import {
  ATTESTATION_KINDS,
  ATTESTATION_TITLE,
  type AttestationKind,
} from '../../../../../../lib/attestations'

type Row = {
  id:             string
  kind:           AttestationKind
  signature_name: string
  attested_at:    string
}

export default function AttestationsPanel({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKind, setBusyKind] = useState<AttestationKind | null>(null)
  const [confirmClear, setConfirmClear] = useState<AttestationKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('ordinand_attestations')
      .select('id, kind, signature_name, attested_at')
      .eq('profile_id', profileId)
    setRows((data ?? []) as Row[])
    setLoading(false)
  }

  async function clearKind(kind: AttestationKind) {
    setBusyKind(kind)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/attestations/clear', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ profile_id: profileId, kind }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error ?? 'Clear failed.')
      setBusyKind(null)
      return
    }
    setConfirmClear(null)
    setBusyKind(null)
    void load()
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="px-8 py-5 border-b border-slate-200">
        <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: C.allianceBlue }}>
          Personal Attestations
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Two CMD-policy requirements recorded as ordinand pledges, not graded items. Clear an attestation only if it was made in error — the ordinand will need to re-sign.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {ATTESTATION_KINDS.map(kind => {
          const row = rows.find(r => r.kind === kind)
          return (
            <div key={kind} className="px-8 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-bold text-slate-800">{ATTESTATION_TITLE[kind]}</div>
                {loading ? (
                  <div className="h-4 w-40 mt-1 bg-slate-100 rounded animate-pulse" />
                ) : row ? (
                  <div className="text-xs text-slate-500 mt-1">
                    Signed <span className="font-bold text-slate-700">{row.signature_name}</span> · {new Date(row.attested_at).toLocaleDateString('en-CA', { timeZone: 'America/Regina', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic mt-1">Not yet attested.</div>
                )}
              </div>
              {row && (
                confirmClear === kind ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => clearKind(kind)}
                      disabled={busyKind === kind}
                      className="text-xs font-bold uppercase tracking-wider text-red-600 hover:text-red-800 disabled:text-slate-300"
                    >
                      {busyKind === kind ? 'Clearing…' : 'Confirm clear'}
                    </button>
                    <button
                      onClick={() => setConfirmClear(null)}
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(kind)}
                    className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-red-600"
                  >
                    Clear
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>
      {error && (
        <div className="px-8 py-3 bg-red-50 border-t border-red-200 text-sm text-red-700">{error}</div>
      )}
    </div>
  )
}
