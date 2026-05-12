// app/dashboard/admin/launch-comms/page.tsx
// Admin-only trigger page for sending preview copies of the three
// 2026 portal launch emails. Reuses the production render pipeline
// (lib/launch-comms.ts) — the preview is byte-identical to the real
// send except for the [PREVIEW] subject prefix and recipient list.
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../utils/supabase/client'
import { C } from '../../../../lib/theme'

type CommResult = {
  email: string
  comm: 'council_prep' | 'ordinand_prep' | 'ordinand_go_live'
  ok: boolean
  detail?: string
}

type SendResponse = {
  sent: boolean
  sentBy?: string
  sentAt?: string
  error?: string
  results?: CommResult[]
}

const COMM_LABELS: Record<CommResult['comm'], string> = {
  council_prep:     '1. Council prep — “Coming May 25 — your week with the new portal”',
  ordinand_prep:    '2. Ordinand prep — “Coming June 1 — the new Ordination Portal”',
  ordinand_go_live: '3. Ordinand go-live — “The portal is here”',
}

export default function LaunchCommsPreviewPage() {
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<SendResponse | null>(null)
  const [error, setError]     = useState<string>('')

  async function handleSend() {
    setSending(true)
    setError('')
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not signed in. Reload and try again.')
        setSending(false)
        return
      }

      const res = await fetch('/api/admin/preview-launch-comms', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = (await res.json()) as SendResponse
      if (!res.ok && !data.results) {
        setError(data.error ?? `HTTP ${res.status}`)
      }
      setResult(data)
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error')
    } finally {
      setSending(false)
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

        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.allianceBlue }}>
            Launch Comms
          </p>
          <h1 className="text-2xl font-black mt-1" style={{ color: C.deepSea }}>
            Preview Launch Emails
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Sends the three launch emails (May 14 / May 15 / June 1) as previews to every admin
            on the portal. Each preview is personalized to the admin&apos;s first name and uses
            the exact same render pipeline as the real launch send — what you see in your inbox
            is what recipients will see, minus the <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">[PREVIEW]</code> subject prefix.
          </p>
          <ul className="mt-4 text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Send-from: <strong>Chris Smith</strong> &lt;noreply@send.canadianmidwest.ca&gt;</li>
            <li>Reply-to: chris@canadianmidwest.ca</li>
            <li>Recipients: every profile with the <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">admin</code> role</li>
          </ul>
        </header>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              backgroundColor: sending ? '#aaa' : C.deepSea,
              color:           C.white,
              padding:         '0.85rem 1.6rem',
              borderRadius:    '8px',
              fontWeight:      'bold',
              border:          'none',
              cursor:          sending ? 'wait' : 'pointer',
              fontSize:        '0.95rem',
            }}
          >
            {sending ? 'Sending previews…' : 'Send Preview Emails'}
          </button>

          {error && (
            <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result?.results && (
            <div className="mt-6">
              <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.allianceBlue }}>
                Send Results
              </h2>
              <div className="space-y-2">
                {result.results.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-sm ${
                      r.ok
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">{r.ok ? '✓ Sent' : '✗ Failed'} — {r.email}</div>
                        <div className="text-xs mt-1 opacity-80">{COMM_LABELS[r.comm] ?? r.comm}</div>
                      </div>
                    </div>
                    {!r.ok && r.detail && (
                      <pre className="mt-2 text-xs whitespace-pre-wrap font-mono opacity-80">{r.detail}</pre>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Sent at {result.sentAt} by {result.sentBy ?? 'unknown'}. Iterate on the copy in
                <code className="text-xs bg-slate-100 px-1 py-0.5 rounded mx-1">lib/launch-comms.ts</code>
                and re-send.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
