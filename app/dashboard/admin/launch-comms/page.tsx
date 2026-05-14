// app/dashboard/admin/launch-comms/page.tsx
// Admin trigger page for launch comms — preview sends (to admins only) and
// real sends (to the full audience). Real send calls the cron recovery path.
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../utils/supabase/client'
import { C } from '../../../../lib/theme'
import type { LaunchCommsKey } from '../../../../lib/launch-comms'

type CommResult = {
  email: string
  comm?: LaunchCommsKey
  ok: boolean
  detail?: string
}

type PreviewResponse = {
  sent: boolean
  sentBy?: string
  sentAt?: string
  error?: string
  results?: CommResult[]
}

type RealSendResponse = {
  firedBy?: string
  firedAt?: string
  key?: string
  recipientCount?: number
  results?: CommResult[]
  error?: string
}

const COMM_LABELS: Record<LaunchCommsKey, string> = {
  council_prep:     '1. Council prep — "Coming May 25 — your week with the new portal"',
  ordinand_prep:    '2. Ordinand prep — "Coming June 1 — the new Ordination Portal"',
  ordinand_go_live: '3. Ordinand go-live — "The portal is here"',
}

const REAL_SEND_CONFIG: { key: LaunchCommsKey; label: string; audience: string; date: string }[] = [
  { key: 'council_prep',     label: 'Council Prep (May 14)',    audience: 'Admin + Council (10)',  date: 'May 14' },
  { key: 'ordinand_prep',    label: 'Ordinand Prep (May 15)',   audience: 'Admin + Ordinand (31)', date: 'May 15' },
  { key: 'ordinand_go_live', label: 'Ordinand Go-Live (Jun 1)', audience: 'Admin + Ordinand (31)', date: 'Jun 1'  },
]

export default function LaunchCommsPreviewPage() {
  const [previewSending, setPreviewSending] = useState(false)
  const [previewResult, setPreviewResult]   = useState<PreviewResponse | null>(null)
  const [previewError, setPreviewError]     = useState('')

  const [realSending, setRealSending] = useState<LaunchCommsKey | null>(null)
  const [realResult, setRealResult]   = useState<{ key: LaunchCommsKey; data: RealSendResponse } | null>(null)
  const [realError, setRealError]     = useState('')

  async function handlePreview() {
    setPreviewSending(true)
    setPreviewError('')
    setPreviewResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setPreviewError('Not signed in. Reload and try again.'); setPreviewSending(false); return }
      const res  = await fetch('/api/admin/preview-launch-comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      })
      const data = (await res.json()) as PreviewResponse
      if (!res.ok && !data.results) setPreviewError(data.error ?? `HTTP ${res.status}`)
      setPreviewResult(data)
    } catch (e: any) {
      setPreviewError(e?.message ?? 'Unexpected error')
    } finally {
      setPreviewSending(false)
    }
  }

  async function handleRealSend(key: LaunchCommsKey, audience: string) {
    if (!confirm(`Send REAL "${key}" email to ${audience}?\n\nThis goes to actual recipients — not a preview.`)) return
    setRealSending(key)
    setRealError('')
    setRealResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setRealError('Not signed in. Reload and try again.'); setRealSending(null); return }
      const res  = await fetch('/api/cron/send-launch-comm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ key }),
      })
      const data = (await res.json()) as RealSendResponse
      if (!res.ok && !data.results) setRealError(data.error ?? `HTTP ${res.status}`)
      setRealResult({ key, data })
    } catch (e: any) {
      setRealError(e?.message ?? 'Unexpected error')
    } finally {
      setRealSending(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <Link href="/dashboard/admin" className="text-sm font-bold text-slate-500 hover:text-slate-700">
            ← Admin Console
          </Link>
        </div>

        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.allianceBlue }}>
            Launch Comms
          </p>
          <h1 className="text-2xl font-black mt-1" style={{ color: C.deepSea }}>
            Launch Emails
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Three scheduled emails for the 2026 portal launch. The cron fires them automatically at
            10 a.m. Regina on their scheduled dates — use the real-send buttons below to fire
            manually if the cron missed or a resend is needed.
          </p>
        </header>

        {/* ── Real Send ──────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.allianceBlue }}>
            Real Send — Live Recipients
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {REAL_SEND_CONFIG.map(({ key, label, audience, date }) => {
              const isSending = realSending === key
              const thisResult = realResult?.key === key ? realResult.data : null
              const allOk = thisResult?.results?.every(r => r.ok)
              return (
                <div key={key} className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-bold text-sm" style={{ color: C.deepSea }}>{label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Audience: {audience} · Scheduled: {date}</div>
                    </div>
                    <button
                      onClick={() => handleRealSend(key, audience)}
                      disabled={!!realSending}
                      style={{
                        backgroundColor: isSending ? '#aaa' : C.deepSea,
                        color: C.white,
                        padding: '0.6rem 1.2rem',
                        borderRadius: '7px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: isSending ? 'wait' : 'pointer',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isSending ? 'Sending…' : 'Send Now'}
                    </button>
                  </div>

                  {thisResult?.results && (
                    <div className="mt-4 space-y-1.5">
                      {thisResult.results.map((r, i) => (
                        <div key={i} className={`px-3 py-2 rounded-lg border text-xs ${r.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                          {r.ok ? '✓' : '✗'} {r.email}
                          {!r.ok && r.detail && <span className="ml-2 opacity-70">{r.detail}</span>}
                        </div>
                      ))}
                      <p className="text-xs text-slate-400 mt-1">
                        {thisResult.recipientCount} recipient{thisResult.recipientCount !== 1 ? 's' : ''} ·
                        sent {thisResult.firedAt} · {allOk ? 'All delivered' : 'Some failed — check above'}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {realError && (
            <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              <strong>Error:</strong> {realError}
            </div>
          )}
        </section>

        {/* ── Preview Send ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.allianceBlue }}>
            Preview Send — Admins Only
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Sends all three emails to every admin profile with a{' '}
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">[PREVIEW]</code> subject prefix.
              Byte-identical render to the real send — what you see is what recipients will see.
            </p>
            <ul className="mb-5 text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Send-from: <strong>Chris Smith</strong> &lt;noreply@send.canadianmidwest.ca&gt;</li>
              <li>Reply-to: chris@canadianmidwest.ca</li>
              <li>Recipients: every profile with the <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">admin</code> role</li>
            </ul>
            <button
              onClick={handlePreview}
              disabled={previewSending}
              style={{
                backgroundColor: previewSending ? '#aaa' : C.allianceBlue,
                color:           C.white,
                padding:         '0.85rem 1.6rem',
                borderRadius:    '8px',
                fontWeight:      'bold',
                border:          'none',
                cursor:          previewSending ? 'wait' : 'pointer',
                fontSize:        '0.95rem',
              }}
            >
              {previewSending ? 'Sending previews…' : 'Send Preview Emails'}
            </button>

            {previewError && (
              <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                <strong>Error:</strong> {previewError}
              </div>
            )}

            {previewResult?.results && (
              <div className="mt-6">
                <div className="space-y-2">
                  {previewResult.results.map((r, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-sm ${r.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold">{r.ok ? '✓ Sent' : '✗ Failed'} — {r.email}</div>
                          {r.comm && <div className="text-xs mt-1 opacity-80">{COMM_LABELS[r.comm] ?? r.comm}</div>}
                        </div>
                      </div>
                      {!r.ok && r.detail && (
                        <pre className="mt-2 text-xs whitespace-pre-wrap font-mono opacity-80">{r.detail}</pre>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Sent at {previewResult.sentAt} by {previewResult.sentBy ?? 'unknown'}.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
