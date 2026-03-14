// app/dashboard/ordinand/process/page.tsx
// Ordination process reference guide — dynamically linked to requirement pages
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../utils/supabase/client'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

const TOPIC_LABELS: Record<string, string> = {
  christ_centred:   'Christ-Centred Life and Ministry',
  spirit_empowered: 'Spirit-Empowered Life and Ministry',
  mission_focused:  'Mission-Focused Life and Ministry',
  scripture:        'The Scriptures',
  divine_healing:   'Divine Healing',
}

// Static notes about book categories — shown alongside the requirement link
const BOOK_CATEGORY_NOTES: Record<string, string> = {
  history:                'Choose 1 of 2 titles',
  theology:               'Choose from approved titles',
  deeper_life:            'Choose 1 of 2 titles',
  missions:               'Choose 1 of 3 options',
  holy_scripture:         'Choose 1 of 2 titles',
  anthropology:           'Choose from approved titles',
  disciple_making:        '1 required title',
  specific_ministry_focus:'Choose 1 book relevant to your field',
}

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
          .select('id, title, event_date, event_type, location, notes')
          .eq('cohort_id', prof.cohort_id)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(4)
        setCohortEvents(evts || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Build lookup maps from fetched requirements
  const bookReqByOrder: Record<number, any> = {}
  const paperReqByTopic: Record<string, any> = {}
  const sermonReqs: any[] = []

  requirements.forEach(r => {
    const tmpl = r.requirement_templates
    if (!tmpl) return
    if (tmpl.type === 'book_report') bookReqByOrder[tmpl.display_order] = r
    if (tmpl.type === 'paper') paperReqByTopic[tmpl.topic] = r
    if (tmpl.type === 'sermon') sermonReqs.push(r)
  })
  sermonReqs.sort((a, b) => (a.requirement_templates?.display_order ?? 0) - (b.requirement_templates?.display_order ?? 0))

  const cohort = profile?.cohorts
  const sermonTopic = cohort?.sermon_topic
  const dueDate = cohort?.assignment_due_date
    ? new Date(cohort.assignment_due_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  // Book report items: display_order → { label, note }
  const bookItems = [
    { order: 10, label: 'History' },
    { order: 20, label: 'Theology (1 of 2)' },
    { order: 21, label: 'Theology (2 of 2)' },
    { order: 30, label: 'Deeper Life' },
    { order: 40, label: 'Missions' },
    { order: 50, label: 'Holy Scripture' },
    { order: 60, label: 'Anthropology (1 of 2)' },
    { order: 61, label: 'Anthropology (2 of 2)' },
    { order: 70, label: 'Disciple-Making' },
    { order: 80, label: 'Specific Ministry Focus' },
  ]

  const STATUS_DOT: Record<string, string> = {
    not_started: 'bg-slate-300',
    submitted: 'bg-blue-400',
    under_review: 'bg-amber-400',
    revision_required: 'bg-red-400',
    complete: 'bg-green-400',
  }

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '📚', number: '10', label: 'Book Reports', sub: '~2 pages each' },
                { icon: '📝', number: '4', label: 'Theological Papers', sub: '10–12 pages each' },
                { icon: '🎤', number: '3', label: 'Sermons', sub: 'Full manuscript + recording link' },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-3xl font-black" style={{ color: C.deepSea }}>{item.number}</p>
                  <p className="text-xs font-black text-slate-600 uppercase tracking-widest mt-1">{item.label}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Cohort calendar */}
          <Section title="Cohort Gatherings">
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
              You are placed in a cohort — spring or fall — based on your anticipated interview season. Cohort gatherings provide peer learning, shared accountability, and group formation led by members of the Ordaining Council.
            </p>
            {cohortEvents.length > 0 ? (
              <div className="space-y-0">
                {cohortEvents.map(ev => {
                  const d = new Date(ev.event_date + 'T12:00:00')
                  const monthLabel = d.toLocaleDateString('en-CA', { month: 'long' })
                  const dayLabel = d.toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric' })
                  const yearLabel = d.getFullYear()
                  const isInPerson = ev.event_type === 'in_person'
                  return (
                    <div key={ev.id} className="flex items-start gap-4 py-3.5 border-b border-slate-100 last:border-0">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-sm font-black" style={{ color: C.deepSea }}>{monthLabel}</p>
                        <p className="text-xs text-slate-400 font-medium">{dayLabel}, {yearLabel}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${isInPerson ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {isInPerson ? 'In Person' : 'Online'}
                          </span>
                          <span className="text-sm text-slate-800 font-bold">{ev.title}</span>
                        </div>
                        {ev.location && <p className="text-xs text-slate-400 font-medium mt-0.5">📍 {ev.location}</p>}
                        {ev.notes && <p className="text-xs text-slate-500 font-medium mt-0.5 italic">{ev.notes}</p>}
                      </div>
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

          {/* Assignments — dynamically linked */}
          <Section title="Your 17 Assignments">
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">Every ordinand completes exactly 17 assignments: 10 book reports, 4 theological papers, and 3 sermons. Click any assignment below to open its submission page.</p>

            {loading ? (
              <p className="text-sm text-slate-400 font-medium text-center py-6">Loading your assignments…</p>
            ) : (
            <div className="space-y-6">

              {/* Book Reports */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">📚 Book Reports (10)</h3>
                <p className="text-sm text-slate-600 font-medium mb-3 leading-relaxed">One book per category, approximately two pages each, single-spaced. Focus on personal application, theological engagement, and connection to your current ministry context.</p>
                <div className="space-y-1.5">
                  {bookItems.map(item => {
                    const req = bookReqByOrder[item.order]
                    const note = BOOK_CATEGORY_NOTES[requirements.find(r => r.id === req?.id)?.requirement_templates?.book_category ?? ''] ?? ''
                    const status = req?.status ?? 'not_started'
                    if (req) {
                      return (
                        <Link key={item.order} href={`/dashboard/ordinand/requirements/${req.id}`}
                          className="flex items-center justify-between py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? 'bg-slate-300'}`} />
                            <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {note && <span className="text-xs text-slate-400 font-medium hidden sm:block">{note}</span>}
                            <span className="text-xs font-bold text-slate-300 group-hover:text-blue-500 transition-colors">Open →</span>
                          </div>
                        </Link>
                      )
                    }
                    // Not yet generated (shouldn't happen, but graceful fallback)
                    return (
                      <div key={item.order} className="flex items-center justify-between py-2 px-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-sm font-bold text-slate-800">{item.label}</span>
                        {note && <span className="text-xs text-slate-400 font-medium">{note}</span>}
                      </div>
                    )
                  })}
                  {/* Read-only items (no submission required) */}
                  {[
                    { label: 'C&MA Manual', note: 'Read only — no report required' },
                    { label: 'Bible (new translation)', note: 'Read only — no report required' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 opacity-60">
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      <span className="text-xs text-slate-400 font-medium">{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theological Papers */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">📝 Theological Papers (4)</h3>
                <p className="text-sm text-slate-600 font-medium mb-3 leading-relaxed">10–12 pages each, written in response to specific questions for each topic. Each paper requires a self-assessment form submitted alongside it. Writing in first person is acceptable and encouraged.</p>
                {sermonTopic ? (
                  <div className="space-y-1.5">
                    {Object.keys(TOPIC_LABELS).filter(t => t !== sermonTopic).map(topic => {
                      const req = paperReqByTopic[topic]
                      const status = req?.status ?? 'not_started'
                      if (req) {
                        return (
                          <Link key={topic} href={`/dashboard/ordinand/requirements/${req.id}`}
                            className="flex items-center justify-between py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? 'bg-slate-300'}`} />
                              <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{TOPIC_LABELS[topic]}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-300 group-hover:text-blue-500 transition-colors">Open →</span>
                          </Link>
                        )
                      }
                      return (
                        <div key={topic} className="flex items-center justify-between py-2 px-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-sm font-bold text-slate-800">{TOPIC_LABELS[topic]}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 px-5 py-4">
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">You will write papers on four of the five theological topics. Your cohort's designated sermon topic is excluded from papers. The five topics are: <span style={{ color: C.deepSea }}>Christ-Centred Life and Ministry, Spirit-Empowered Life and Ministry, Mission-Focused Life and Ministry, The Scriptures,</span> and <span style={{ color: C.deepSea }}>Divine Healing.</span></p>
                  </div>
                )}
              </div>

              {/* Sermons */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">🎤 Sermons (3)</h3>
                <p className="text-sm text-slate-600 font-medium mb-3 leading-relaxed">Three sermons on your cohort's designated sermon topic. Each sermon must address one of the specific questions assigned to it. Submit a full manuscript — not just an outline — and paste a link to your recording if available.</p>
                {sermonReqs.length > 0 ? (
                  <div className="space-y-1.5">
                    {sermonReqs.map(req => {
                      const status = req.status ?? 'not_started'
                      return (
                        <Link key={req.id} href={`/dashboard/ordinand/requirements/${req.id}`}
                          className="flex items-center justify-between py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? 'bg-slate-300'}`} />
                            <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{req.requirement_templates?.title}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-300 group-hover:text-blue-500 transition-colors">Open →</span>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-slate-600 font-medium">
                    <p className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 leading-relaxed">At the top of each manuscript include: the <strong>date and occasion</strong>, the <strong>theme</strong>, and the <strong>specific question being addressed</strong>.</p>
                  </div>
                )}
              </div>

            </div>
            )}
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
              <h2 className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: C.allianceBlue }}>Study Agent</h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">Use the CMD Study Agent to explore theology, work through paper topics, or practise for your oral interview with guided question walkthroughs.</p>
            </div>
            <Link href="/dashboard/study"
              style={{ backgroundColor: C.deepSea, color: C.white, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Open Study Agent →
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
