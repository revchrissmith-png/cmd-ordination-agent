// app/dashboard/admin/pardington-usage/page.tsx
// Admin report: per-ordinand Anthropic token usage and estimated cost for
// Pardington (the AI study partner). Reads the pardington_usage_by_user view,
// which is RLS-restricted to admins — a non-admin sees an empty table.
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../utils/supabase/client'
import { C } from '../../../../lib/theme'

// numeric / bigint columns come back from PostgREST as strings — coerce always.
type UsageRow = {
  ordinand_id: string
  full_name: string | null
  requests: number | string
  input_tokens: number | string
  output_tokens: number | string
  cache_write_tokens: number | string
  cache_read_tokens: number | string
  estimated_cost_usd: number | string
  first_used: string | null
  last_used: string | null
}

const num = (v: number | string | null) => Number(v ?? 0)
const fmtInt = (v: number | string | null) => num(v).toLocaleString('en-CA')
const fmtCost = (v: number) => `$${v.toFixed(4)}`
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function PardingtonUsagePage() {
  const [rows, setRows] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('pardington_usage_by_user')
      .select('*')
      .order('estimated_cost_usd', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows((data ?? []) as UsageRow[])
        setLoading(false)
      })
  }, [])

  const totalCost      = rows.reduce((s, r) => s + num(r.estimated_cost_usd), 0)
  const totalRequests  = rows.reduce((s, r) => s + num(r.requests), 0)
  const totalCacheRead = rows.reduce((s, r) => s + num(r.cache_read_tokens), 0)
  // Cache reads bill at $0.10/M vs $1.00/M for uncached input — $0.90/M saved.
  const cacheSavings   = (totalCacheRead * 0.90) / 1_000_000

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <Link href="/dashboard/admin" className="text-sm font-bold text-slate-500 hover:text-slate-700">
            ← Admin Console
          </Link>
        </div>

        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.allianceBlue }}>
            Pardington
          </p>
          <h1 className="text-2xl font-black mt-1" style={{ color: C.deepSea }}>
            Usage &amp; Cost
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Anthropic API token usage per ordinand, one row per Pardington exchange. Tracking began
            when this feature shipped — earlier usage is not recoverable. Dollar figures are estimates
            from current Claude Haiku 4.5 rates.
          </p>
        </header>

        {/* ── Summary ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total estimated cost', value: fmtCost(totalCost) },
            { label: 'Total exchanges',      value: fmtInt(totalRequests) },
            { label: 'Saved by caching',     value: fmtCost(cacheSavings) },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.label}</div>
              <div className="text-2xl font-black mt-1.5" style={{ color: C.deepSea }}>{stat.value}</div>
            </div>
          ))}
        </section>

        {/* ── Per-ordinand table ─────────────────────────────────────── */}
        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-sm text-slate-400">
            Loading usage…
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
            <p className="text-sm font-bold" style={{ color: C.deepSea }}>No usage recorded yet</p>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Rows appear here as ordinands use Pardington. Check back after the next round of study sessions.
            </p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-4 py-3">Ordinand</th>
                  <th className="px-4 py-3 text-right">Exchanges</th>
                  <th className="px-4 py-3 text-right">Input</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3 text-right">Cached read</th>
                  <th className="px-4 py-3 text-right">Est. cost</th>
                  <th className="px-4 py-3 text-right">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.ordinand_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold" style={{ color: C.deepSea }}>
                      {r.full_name ?? 'Unknown ordinand'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtInt(r.requests)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtInt(r.input_tokens)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtInt(r.output_tokens)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtInt(r.cache_read_tokens)}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: C.deepSea }}>
                      {fmtCost(num(r.estimated_cost_usd))}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmtDate(r.last_used)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-400 leading-relaxed">
          Rates (USD per million tokens): input $1.00 · output $5.00 · cache write $1.25 · cache read $0.10.
          &ldquo;Saved by caching&rdquo; is the difference between the cached-read rate and the full input
          rate on tokens served from cache.
        </p>

      </div>
    </div>
  )
}
