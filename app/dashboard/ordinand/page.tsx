// app/dashboard/ordinand/page.tsx
// Ordinand dashboard — view all requirements, statuses, links to submission pages
'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../../utils/supabase/client'
import { logActivity } from '../../../utils/logActivity'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

type Status = 'not_started' | 'submitted' | 'under_review' | 'revision_required' | 'complete'

const STATUS_CONFIG: Record<Status, { label: string; colour: string; dot: string }> = {
  not_started:       { label: 'Not Started',      colour: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-300' },
  submitted:         { label: 'Submitted',         colour: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400' },
  under_review:      { label: 'Under Review',      colour: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  revision_required: { label: 'Revision Required', colour: 'bg-red-100 text-red-700',       dot: 'bg-red-400' },
  complete:          { label: 'Complete',           colour: 'bg-green-100 text-green-700',   dot: 'bg-green-400' },
}

export default function OrdinandDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [cohortMembers, setCohortMembers] = useState<any[]>([])
  const [showCohortPopover, setShowCohortPopover] = useState(false)
  const [loading, setLoading] = useState(true)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, email, cohort_id, cohorts(year, season, sermon_topic, assignment_due_date)')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      const { data: reqs } = await supabase
        .from('ordinand_requirements')
        .select(`id, status, requirement_templates(id, type, topic, title, book_category, display_order)`)
        .eq('ordinand_id', user.id)
      setRequirements(reqs || [])

      if (prof?.cohort_id) {
        // Upcoming events — cohort-specific + all-cohorts (null cohort_id)
        const today = new Date().toISOString().slice(0, 10)
        const { data: evts } = await supabase
          .from('cohort_events')
          .select('id, title, event_date, event_type, location, notes, requirement_templates!linked_template_id(id, title, type)')
          .or(`cohort_id.eq.${prof.cohort_id},cohort_id.is.null`)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(6)
        setEvents(evts || [])

        // Other ordinands in the same cohort
        const { data: members } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('cohort_id', prof.cohort_id)
          .contains('roles', ['ordinand'])
          .neq('id', user.id)
          .order('last_name')
        setCohortMembers(members || [])
      }

      logActivity(user.id, 'ordinand_dashboard', '/dashboard/ordinand')
      setLoading(false)
    }
    fetchData()
  }, [])

  const byOrder = (a: any, b: any) => (a.requirement_templates?.display_order ?? 0) - (b.requirement_templates?.display_order ?? 0)
  const bookReports = requirements.filter(r => r.requirement_templates?.type === 'book_report').sort(byOrder)
  const papers      = requirements.filter(r => r.requirement_templates?.type === 'paper').sort(byOrder)
  const sermons     = requirements.filter(r => r.requirement_templates?.type === 'sermon').sort(byOrder)
  const total    = requirements.length
  const complete = requirements.filter(r => r.status === 'complete').length
  const inProgress = requirements.filter(r => ['submitted','under_review','revision_required'].includes(r.status)).length
  const notStarted = requirements.filter(r => r.status === 'not_started').length
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0

  const cohort = profile?.cohorts
  const dueDate = cohort?.assignment_due_date
    ? new Date(cohort.assignment_due_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const daysUntilDue = cohort?.assignment_due_date
    ? Math.ceil((new Date(cohort.assignment_due_date + 'T12:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  function renderMarkdown(text: string): string {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#0077C8;text-decoration:underline;">$1</a>')
      .replace(/\n/g, '<br/>')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading your dashboard...
    </div>
  )

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
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
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">CMD Ordinand</p>
          <h1 className="text-4xl font-black" style={{ color: C.deepSea }}>{profile?.full_name || 'My Dashboard'}</h1>

          {/* Cohort name with hover popover */}
          {cohort && (
            <div className="relative inline-block mt-1" ref={popoverRef}>
              <button
                className="text-slate-500 font-medium capitalize hover:text-blue-600 transition-colors focus:outline-none"
                onMouseEnter={() => setShowCohortPopover(true)}
                onMouseLeave={() => setShowCohortPopover(false)}
                onClick={() => setShowCohortPopover(v => !v)}
              >
                {cohort.season} {cohort.year} Cohort
                {cohortMembers.length > 0 && (
                  <span className="ml-2 text-xs font-bold text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
                    {cohortMembers.length + 1} members
                  </span>
                )}
              </button>
              {showCohortPopover && cohortMembers.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-20 min-w-[200px]"
                  onMouseEnter={() => setShowCohortPopover(true)}
                  onMouseLeave={() => setShowCohortPopover(false)}
                >
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Your Cohort</p>
                  <ul className="space-y-2">
                    <li className="text-sm font-bold text-blue-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {profile?.full_name} (you)
                    </li>
                    {cohortMembers.map(m => (
                      <li key={m.id} className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                        {m.first_name} {m.last_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Overall Progress</p>
              <p className="text-3xl font-black text-slate-900">{pct}%</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center"><p className="font-black text-green-600 text-xl">{complete}</p><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Complete</p></div>
              <div className="text-center"><p className="font-black text-amber-500 text-xl">{inProgress}</p><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">In Progress</p></div>
              <div className="text-center"><p className="font-black text-slate-400 text-xl">{notStarted}</p><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Not Started</p></div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-bold mt-2"><span>0</span><span>{total} requirements</span></div>

          {/* Due date */}
          {dueDate && (
            <div className={`mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap`}>
              <span className="text-xs text-slate-500 font-medium">
                All assignments due by <span className="font-black text-slate-700">{dueDate}</span>
              </span>
              {daysUntilDue !== null && daysUntilDue >= 0 && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${daysUntilDue <= 30 ? 'bg-red-50 text-red-600' : daysUntilDue <= 90 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                  {daysUntilDue} days remaining
                </span>
              )}
              {daysUntilDue !== null && daysUntilDue < 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400">Deadline passed</span>
              )}
            </div>
          )}
        </div>

        {/* Quick-access cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/dashboard/ordinand/process"
            className="bg-white rounded-2xl border border-slate-200 px-6 py-5 hover:shadow-md hover:border-blue-200 transition-all group flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: C.allianceBlue }}>Process Guide</p>
              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">The Ordination Journey</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Timeline, mentorship & interview</p>
            </div>
            <span className="text-slate-300 group-hover:text-blue-400 transition-colors font-bold text-lg ml-4">→</span>
          </Link>
          <Link href="/dashboard/study"
            className="bg-white rounded-2xl border border-slate-200 px-6 py-5 hover:shadow-md hover:border-blue-200 transition-all group flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: C.allianceBlue }}>Pardington</p>
              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">AI Ordination Study Partner</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Explore theology & interview prep</p>
            </div>
            <span className="text-slate-300 group-hover:text-blue-400 transition-colors font-bold text-lg ml-4">→</span>
          </Link>
          <Link href="/dashboard/ordinand/profile"
            className="bg-white rounded-2xl border border-slate-200 px-6 py-5 hover:shadow-md hover:border-blue-200 transition-all group flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: C.allianceBlue }}>My Profile</p>
              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">Personal Details</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Name, email, cohort information</p>
            </div>
            <span className="text-slate-300 group-hover:text-blue-400 transition-colors font-bold text-lg ml-4">→</span>
          </Link>
        </div>

        {/* Upcoming events */}
        {events.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: C.allianceBlue }}>Upcoming Gatherings</p>
            <div className="space-y-2">
              {events.map(ev => {
                const d = new Date(ev.event_date + 'T12:00:00')
                const monthStr = d.toLocaleDateString('en-CA', { month: 'short' })
                const dateStr = d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                const daysUntil = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const isExpanded = expandedEventId === ev.id
                return (
                  <div key={ev.id} className={`rounded-2xl border transition-all ${isExpanded ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 hover:border-blue-100 hover:bg-slate-50/60'}`}>
                    {/* Compact row — always visible, click to expand */}
                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                      className="w-full text-left flex items-center gap-4 px-4 py-3"
                    >
                      <div className="text-center bg-slate-100 rounded-xl px-3 py-2 min-w-[52px] flex-shrink-0">
                        <p className="text-xs font-black text-slate-500 uppercase">{monthStr}</p>
                        <p className="text-xl font-black text-slate-800 leading-none">{d.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{ev.title}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ev.event_type === 'in_person' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {ev.event_type === 'in_person' ? '📍 In Person' : '💻 Online'}
                          </span>
                          {daysUntil <= 14 && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Coming up!</span>}
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <span className="text-slate-300 font-bold text-sm flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-1 border-t border-blue-100">
                        <p className="text-sm font-bold text-slate-700 mb-3">{dateStr}</p>
                        {ev.requirement_templates && (() => {
                          const linkedReq = requirements.find(r => r.requirement_templates?.id === ev.requirement_templates.id)
                          const typeIcon = ev.requirement_templates.type === 'book_report' ? '📚' : ev.requirement_templates.type === 'sermon' ? '🎤' : '📝'
                          return (
                            <div className="flex items-start gap-2 mb-3 bg-purple-50 rounded-xl px-3 py-2 border border-purple-100">
                              <span className="text-xs mt-0.5">{typeIcon}</span>
                              <div>
                                <p className="text-xs font-black text-purple-500 uppercase tracking-widest mb-0.5">Discussing</p>
                                {linkedReq
                                  ? <Link href={`/dashboard/ordinand/requirements/${linkedReq.id}`} className="text-sm font-bold text-purple-700 hover:underline">{ev.requirement_templates.title} →</Link>
                                  : <span className="text-sm font-bold text-purple-700">{ev.requirement_templates.title}</span>
                                }
                              </div>
                            </div>
                          )
                        })()}
                        {ev.location && (
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-slate-400 text-xs mt-0.5">📍</span>
                            <p className="text-sm text-slate-600 font-medium">{ev.location}</p>
                          </div>
                        )}
                        {ev.notes && (
                          <div className="flex items-start gap-2">
                            <span className="text-slate-400 text-xs mt-0.5">📋</span>
                            <p className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(ev.notes) }} />
                          </div>
                        )}
                        {!ev.location && !ev.notes && !ev.requirement_templates && (
                          <p className="text-xs text-slate-400 italic">No additional details provided.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Submission guidance banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 mb-8 flex items-start gap-3">
          <span className="text-blue-400 text-lg mt-0.5">ℹ️</span>
          <p className="text-sm text-blue-700 font-medium leading-relaxed">
            <span className="font-black">To submit an assignment,</span> click on any requirement below. Each page has full submission instructions and a form to upload your work.
          </p>
        </div>

        {[
          { label: 'Book Reports', items: bookReports, icon: '📚', count: bookReports.length },
          { label: 'Theological Papers', items: papers, icon: '📝', count: papers.length },
          { label: 'Sermons', items: sermons, icon: '🎤', count: sermons.length },
        ].map(({ label, items, icon, count }) => count > 0 && (
          <div key={label} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{icon}</span>
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</h2>
              <span className="text-xs font-bold text-slate-400">({count})</span>
            </div>
            <div className="space-y-2">
              {items.map(req => {
                const status: Status = req.status ?? 'not_started'
                const cfg = STATUS_CONFIG[status]
                const isRevision = status === 'revision_required'
                return (
                  <Link key={req.id} href={`/dashboard/ordinand/requirements/${req.id}`}
                    className={`flex items-center justify-between bg-white border rounded-2xl px-6 py-4 hover:shadow-md hover:border-blue-200 transition-all group ${isRevision ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{req.requirement_templates?.title}</span>
                      {isRevision && <span className="text-xs font-black text-red-600">⚠ Action Required</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.colour}`}>{cfg.label}</span>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-blue-500 transition-colors whitespace-nowrap">
                        {status === 'not_started' ? 'Submit →' : 'View →'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {requirements.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 font-bold">No requirements found.</p>
            <p className="text-slate-300 text-sm font-medium mt-1">Contact your administrator if this seems incorrect.</p>
          </div>
        )}

      </div>
    </main>
    </div>
  )
}
