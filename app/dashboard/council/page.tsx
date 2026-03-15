// app/dashboard/council/page.tsx
// Council member dashboard — view all assigned requirements, filter by status, link to grading
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../utils/supabase/client'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

type Status = 'not_started' | 'submitted' | 'under_review' | 'revision_required' | 'complete'

const STATUS_CONFIG: Record<Status, { label: string; colour: string; dot: string }> = {
  not_started:       { label: 'Not Started',      colour: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-300' },
  submitted:         { label: 'Submitted',         colour: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400' },
  under_review:      { label: 'Under Review',      colour: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  revision_required: { label: 'Revision Required', colour: 'bg-red-100 text-red-700',       dot: 'bg-red-400' },
  complete:          { label: 'Complete',           colour: 'bg-green-100 text-green-700',   dot: 'bg-green-400' },
}

type FilterTab = 'needs_review' | 'all' | 'complete'

export default function CouncilDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('needs_review')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('full_name, email, roles').eq('id', user.id).single()
      setProfile(prof)
      const { data: assigns } = await supabase
        .from('grading_assignments')
        .select(`id, assigned_by, reassigned_at,
          ordinand_requirements(
            id, status,
            requirement_templates(id, type, topic, title),
            profiles!ordinand_id(full_name, email),
            cohorts(year, season)
          )`)
        .eq('council_member_id', user.id)
      setAssignments(assigns || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const needsReview = assignments.filter(a => ['submitted','under_review'].includes(a.ordinand_requirements?.status))
  const allActive   = assignments.filter(a => a.ordinand_requirements?.status !== 'complete')
  const completed   = assignments.filter(a => a.ordinand_requirements?.status === 'complete')
  const filtered    = filter === 'needs_review' ? needsReview : filter === 'complete' ? completed : assignments

  const TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: 'needs_review', label: 'Needs Review', count: needsReview.length },
    { id: 'all',          label: 'All Assigned', count: assignments.length },
    { id: 'complete',     label: 'Complete',     count: completed.length },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading your assignments...
    </div>
  )

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Dashboard</Link>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── ALPHA BANNER — remove before public launch ── */}
      <div style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #F59E0B', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1rem' }}>⚗️</span>
        <span style={{ color: '#92400E', fontSize: '0.82rem', fontWeight: '700', letterSpacing: '0.02em' }}>
          Alpha Build · v0.1.0 · Testing in progress — please report any issues to the District Office
        </span>
      </div>
      {/* ── END ALPHA BANNER ── */}

    <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
      <div className="max-w-4xl mx-auto">

        <div className="mb-10">
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Ordaining Council</p>
          <h1 className="text-4xl font-black" style={{ color: C.deepSea }}>{profile?.full_name || 'My Assignments'}</h1>
          <p className="text-slate-400 font-medium mt-1">{assignments.length} total assignments</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-2xl font-black text-blue-600">{needsReview.length}</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Needs Review</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-2xl font-black text-amber-500">{allActive.length}</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">In Progress</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-2xl font-black text-green-600">{completed.length}</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Complete</p>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${filter === tab.id ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-black ${filter === tab.id ? 'bg-blue-500' : 'bg-slate-100 text-slate-400'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 font-bold">{filter === 'needs_review' ? 'No assignments awaiting review.' : 'No assignments found.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(assign => {
              const req = assign.ordinand_requirements
              if (!req) return null
              const status: Status = req.status ?? 'not_started'
              const cfg = STATUS_CONFIG[status]
              const isPaper = req.requirement_templates?.type === 'paper'
              const needsGrade = status === 'submitted' || status === 'under_review'
              const cohort = req.cohorts ? `${req.cohorts.season} ${req.cohorts.year}` : ''
              return (
                <Link key={assign.id} href={`/dashboard/council/grade/${assign.id}`}
                  className={`flex items-center justify-between bg-white border rounded-2xl px-6 py-5 hover:shadow-md hover:border-blue-200 transition-all group ${needsGrade ? 'border-blue-200' : 'border-slate-200'}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">{req.requirement_templates?.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-sm text-slate-500 font-medium">{req.profiles?.full_name}</p>
                        {cohort && <><span className="text-slate-200 font-bold">·</span><p className="text-xs text-slate-400 font-medium">{cohort}</p></>}
                        {isPaper && <><span className="text-slate-200 font-bold">·</span><span className="text-xs font-bold text-purple-600">Paper</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.colour}`}>{cfg.label}</span>
                    {needsGrade
                      ? <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm">Grade →</span>
                      : <span className="text-slate-300 group-hover:text-blue-400 transition-colors font-bold">→</span>
                    }
                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </div>
    </main>
    </div>
  )
}
