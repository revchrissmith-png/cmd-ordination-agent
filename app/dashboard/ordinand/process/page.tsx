// app/dashboard/ordinand/process/page.tsx
// Ordination process reference guide — dynamically linked to requirement pages
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../utils/supabase/client'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
      <h2 className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: C.allianceBlue }}>{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({ label, value, valueNode }: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-44 flex-shrink-0 pt-0.5">{label}</span>
      {valueNode ?? <span className="text-sm text-slate-700 font-medium leading-relaxed">{value}</span>}
    </div>
  )
}

export default function OrdinandProcessPage() {
  const [profile, setProfile] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [cohortEvents, setCohortEvents] = useState<any[]>([])
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('mentor_name, mentor_email, cohort_id, cohorts(year, season, sermon_topic, assignment_due_date)')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      const { data: reqs } = await supabase
        .from('ordinand_requirements')
        .select('id, status, requirement_templates(type, topic, book_category, title, display_order)')
        .eq('ordinand_id', user.id)
      setRequirements(reqs || [])
      if (prof?.cohort_id) {
        const today = new Date().toISOString().split('T')[0]
        const { data: evts } = await supabase
          .from('cohort_events')
          .select('id, title, event_date, event_type, location, notes, requirement_templates!linked_template_id(id, title, type)')
          .or(`cohort_ids.cs.{"${prof.cohort_id}"},cohort_ids.is.null`)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(6)
        setCohortEvents(evts || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  function renderMarkdown(text: string): string {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#0077C8;text-decoration:underline;">$1</a>')
      .replace(/\n/g, '<br/>')
  }

  const cohort = profile?.cohorts
  const dueDate = cohort?.assignment_due_date
    ? new Date(cohort.assignment_due_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <Link href="/dashboard/ordinand" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← My Dashboard</Link>
      </header>

      <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-3xl mx-auto">

          <div className="mb-10">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Reference Guide</p>
            <h1 className="text-4xl font-black" style={{ color: C.deepSea }}>The Ordination Journey</h1>
            <p className="text-slate-500 font-medium mt-2">Everything you need to know about the CMD ordination process, drawn from the official handbook.</p>
            {cohort && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold capitalize">{cohort.season} {cohort.year} Cohort</span>
                {dueDate && <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">All assignments due {dueDate}</span>}
              </div>
            )}
          </div>

          {/* Overview */}
          <Section title="Overview">
            <p className="text-sm text-slate-700 font-medium leading-relaxed mb-5">
              The CMD ordination process unfolds over approximately three years, beginning shortly after you receive a portable licence. It is designed to foster spiritual depth, theological reflection, pastoral skill, and missional imagination. The goal is not simply to complete requirements but to flourish in your calling.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {[
                { icon: '📚', number: '10', label: 'Book Reports', sub: '~2 pages each, one per reading category' },
                { icon: '📝', number: '4', label: 'Theological Papers', sub: '10–12 pages, with built-in self-assessment' },
                { icon: '🎤', number: '3', label: 'Sermons', sub: 'Full manuscript + recording on your assigned topic' },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-3xl font-black" style={{ color: C.deepSea }}>{item.number}</p>
                  <p className="text-xs font-black text-slate-600 uppercase tracking-widest mt-1">{item.label}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            <Link href="/dashboard/ordinand"
              className="flex items-center justify-between px-5 py-4 bg-blue-50 border border-blue-100 rounded-2xl hover:border-blue-200 hover:bg-blue-100/60 transition-all group">
              <div>
                <p className="text-sm font-black text-blue-800">View your assignment checklist</p>
                <p className="text-xs text-blue-600 font-medium mt-0.5">Track status, submit work, and view feedback for all 17 requirements</p>
              </div>
              <span className="text-blue-400 font-bold text-lg group-hover:text-blue-600 transition-colors flex-shrink-0 ml-4">→</span>
            </Link>
          </Section>

          {/* Cohort calendar */}
          <Section title="Cohort Gatherings">
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
              You are placed in a cohort — spring or fall — based on your anticipated interview season. Cohort gatherings provide peer learning, shared accountability, and group formation led by members of the Ordaining Council.
            </p>
            {cohortEvents.length > 0 ? (
              <div className="space-y-2">
                {cohortEvents.map(ev => {
                  const d = new Date(ev.event_date + 'T12:00:00')
                  const monthStr = d.toLocaleDateString('en-CA', { month: 'short' })
                  const dateStr = d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  const daysUntil = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const isExpanded = expandedEventId === ev.id
                  const linkedReq = ev.requirement_templates
                    ? requirements.find((r: any) => r.requirement_templates?.id === ev.requirement_templates.id)
                    : null
                  return (
                    <div key={ev.id} className={`rounded-2xl border transition-all ${isExpanded ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 hover:border-blue-100 hover:bg-slate-50/60'}`}>
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
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 border-t border-blue-100">
                          <p className="text-sm font-bold text-slate-700 mb-3">{dateStr}</p>
                          {linkedReq && (() => {
                            const typeIcon = ev.requirement_templates.type === 'book_report' ? '📚' : ev.requirement_templates.type === 'sermon' ? '🎤' : '📝'
                            return (
                              <div className="flex items-start gap-2 mb-3 bg-purple-50 rounded-xl px-3 py-2 border border-purple-100">
                                <span className="text-xs mt-0.5">{typeIcon}</span>
                                <div>
                                  <p className="text-xs font-black text-purple-500 uppercase tracking-widest mb-0.5">Discussing</p>
                                  <Link href={`/dashboard/ordinand/requirements/${linkedReq.id}`} className="text-sm font-bold text-purple-700 hover:underline">{ev.requirement_templates.title} →</Link>
                                </div>
                              </div>
                            )
                          })()}
                          {ev.location && (
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-slate-400 text-xs mt-0.5">📍</span>
                              {/^https?:\/\//i.test(ev.location)
                                ? <a href={ev.location} target="_blank" rel="noopener noreferrer" className="text-sm font-bold" style={{ color: '#0077C8', textDecoration: 'underline' }}>
                                    {/zoom\.us/i.test(ev.location) ? '📹 Join Zoom Meeting'
                                      : /teams\.microsoft|teams\.live/i.test(ev.location) ? '💬 Join Teams Meeting'
                                      : /meet\.google/i.test(ev.location) ? '📹 Join Google Meet'
                                      : /webex/i.test(ev.location) ? '📹 Join Webex Meeting'
                                      : '🔗 Click here to join meeting'}
                                  </a>
                                : <p className="text-sm text-slate-600 font-medium">{ev.location}</p>
                              }
                            </div>
                          )}
                          {ev.notes && (
                            <div className="flex items-start gap-2">
                              <span className="text-slate-400 text-xs mt-0.5">📋</span>
                              <p className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(ev.notes) }} />
                            </div>
                          )}
                          {!ev.location && !ev.notes && !linkedReq && (
                            <p className="text-xs text-slate-400 italic">No additional details provided.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : !loading ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-5 mb-5">
                <p className="text-sm text-slate-500 font-medium">No upcoming gatherings have been scheduled yet. Check back soon, or contact the District Office for dates.</p>
              </div>
            ) : null}
            <div className="mt-5 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-amber-700 leading-relaxed">Attendance at all quarterly gatherings is expected. If you must miss one, notify the Chair of the Ordaining Council in advance and complete any required catch-up work.</p>
            </div>
          </Section>

          {/* Mentorship */}
          <Section title="Mentorship">
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">Mentorship is one of the most vital components of the ordination journey. You are matched with a mentor — an ordained pastor or experienced ministry worker who is not your direct supervisor.</p>

            {/* Mentor contact info */}
            {(profile?.mentor_name || profile?.mentor_email) && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Your Mentor</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  {profile.mentor_name && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Name</p>
                      <p className="font-bold text-slate-800">{profile.mentor_name}</p>
                    </div>
                  )}
                  {profile.mentor_email && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                      <a href={`mailto:${profile.mentor_email}`} className="font-bold text-blue-600 hover:text-blue-800 transition-colors">{profile.mentor_email}</a>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!profile?.mentor_name && !loading && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-5">
                <p className="text-xs font-bold text-amber-700">No mentor has been assigned yet. Contact the District Office if you have questions about your mentorship.</p>
              </div>
            )}

            <div className="space-y-0">
              <InfoRow label="Meeting frequency" value="Monthly, 60–90 minutes (in person or online)" />
              <InfoRow label="Your mentor's role" value="To listen, ask questions, offer challenge, and encourage growth — not to evaluate performance" />
              <InfoRow label="Your responsibility" value="Initiate meetings, come prepared with reflection on current assignments or ministry situations, be open to feedback and spiritual challenge" />
              <InfoRow label="Monthly reports" valueNode={
                <span className="text-sm text-slate-700 font-medium leading-relaxed">
                  You send a short written report to your mentor each month before your meeting — covering spiritual formation, ministry, and personal development.{' '}
                  <Link href="/dashboard/ordinand/mentor-report" className="text-blue-600 hover:text-blue-800 font-bold underline">View the report template →</Link>
                </span>
              } />
              <InfoRow label="Pre-interview evaluation" value="Your mentor completes a formal evaluation in the months leading up to your oral interview" />
            </div>
          </Section>

          {/* Interview */}
          <Section title="The Oral Interview">
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">The final step is a formal interview with the Ordaining Council. It is a pastoral and theological conversation — not an academic defence — lasting approximately 120 minutes, followed by 30 minutes of council deliberation.</p>
            <div className="space-y-0 mb-6">
              <InfoRow label="When" value="May (spring cohort) or October (fall cohort)" />
              <InfoRow label="Eligibility" value="All 17 assignments submitted, minimum two years in ministry, mentor and church board evaluations received" />
              <InfoRow label="Format" value="Full Ordaining Council present; members rotate as primary interlocutor. Dress as you would for a formal professional interview." />
              <InfoRow label="Topics covered" value="Your personal history and calling, Holy Scripture, the Trinity, Alliance theology and mission, the Fourfold Gospel (Salvation, Sanctification, Healing, Coming King), the Church, and Anthropology" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { outcome: 'Sustained', description: 'Approved for ordination pending affirmation by the licensing body', colour: 'bg-green-50 border-green-200 text-green-800' },
                { outcome: 'Conditionally Sustained', description: 'Additional steps required before an ordination service — no re-interview needed', colour: 'bg-blue-50 border-blue-200 text-blue-800' },
                { outcome: 'Deferred', description: 'Additional assignments or growth required; interview to be rescheduled', colour: 'bg-amber-50 border-amber-200 text-amber-800' },
                { outcome: 'Not Sustained', description: 'Reserved for cases with serious theological, spiritual, or vocational concerns', colour: 'bg-red-50 border-red-200 text-red-800' },
              ].map(item => (
                <div key={item.outcome} className={`rounded-2xl border px-5 py-4 ${item.colour}`}>
                  <p className="text-xs font-black uppercase tracking-widest mb-1">{item.outcome}</p>
                  <p className="text-xs font-medium leading-relaxed opacity-80">{item.description}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Study agent link */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: C.allianceBlue }}>Pardington</h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">Use Pardington — your AI ordination study partner — to explore theology, work through paper topics, or practise for your oral interview with guided question walkthroughs.</p>
            </div>
            <Link href="/dashboard/study"
              style={{ backgroundColor: C.deepSea, color: C.white, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Open Pardington →
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
