// app/dashboard/ordinand/mentor-report/page.tsx
// Monthly ordinand report — fillable form that compiles into a pre-filled email to mentor
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../utils/supabase/client'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

const SECTIONS = [
  {
    title: 'Spiritual Formation and Relationship with God',
    icon: '🙏',
    questions: [
      'What meaningful spiritual practices did you engage in this month? What was your frequency rhythm?',
      'What spiritual practices would you like to explore?',
      'How is God speaking to you right now? What is God\'s invitation to you in the area of personal growth and transformation?',
    ],
  },
  {
    title: 'Preaching / Teaching Ministry',
    icon: '📖',
    questions: [
      'How have you had the opportunity to minister in this way this month? Please list the events and frequency.',
      'What are some examples of encouragements or challenges you experienced in this area?',
      'How have you had the opportunity to receive training or learning in this area?',
      'How would you like to grow and develop in your preaching/teaching ministry?',
    ],
  },
  {
    title: 'Shepherding Ministry',
    icon: '🤝',
    questions: [
      'What are some examples of how you were able to minister to others in this way? This may include visitation, counselling, evangelism, baptisms, hospital visits, etc.',
      'What did you learn about your own shepherding practices?',
      'In what ways do you hope to grow in this area? In what ways have you seen growth?',
      'Within the context in which you serve, both vocationally and within the congregation, who are examples of a shepherding heart and what can you learn from their example?',
    ],
  },
  {
    title: 'Administrative Ministry',
    icon: '📋',
    questions: [
      'What types of meetings have you been part of this month? (examples: committee meetings, staff meetings, ministerial, ministry events)',
      'What was your participation in those meetings?',
      'What are areas of effectiveness in how you were part of the team? What are areas in which you can grow as a team member?',
      'Were there areas of conflict? How did you engage in those areas?',
    ],
  },
  {
    title: 'Personal Development',
    icon: '🌱',
    questions: [
      'How have you engaged your mind in worship this month? What books have you read, etc.?',
      'What theological issue is present for you personally or in your ministry context?',
      'How is your attention to your physical health?',
      'Do you have healthy rhythms of Sabbath? Explain.',
      'Any problems or challenges in your personal life that are limiting your ability to be fully engaged with your ministry?',
    ],
  },
  {
    title: 'Mentor / Mentee Relationship',
    icon: '💬',
    questions: [
      'How can your mentor support you in prayer this month?',
      'Do you need advice or assistance with a particular issue or area?',
      'What do you hope to discuss at your next meeting with your mentor?',
    ],
  },
]

export default function MentorReportPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // answers keyed by "sectionIndex-questionIndex"
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, mentor_name, mentor_email')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  // Warn before leaving with unsaved answers
  const hasUnsavedWork = Object.values(answers).some(v => v.trim().length > 0) && !submitted
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedWork])

  function setAnswer(si: number, qi: number, value: string) {
    setAnswers(prev => ({ ...prev, [`${si}-${qi}`]: value }))
  }

  function getAnswer(si: number, qi: number): string {
    return answers[`${si}-${qi}`] ?? ''
  }

  function sectionHasAnyAnswer(si: number): boolean {
    return SECTIONS[si].questions.some((_, qi) => getAnswer(si, qi).trim().length > 0)
  }

  function totalAnswered(): number {
    return Object.values(answers).filter(v => v.trim().length > 0).length
  }

  function buildMailto(): string {
    const name = profile?.full_name || 'Your Ordinand'
    const mentor = profile?.mentor_name || 'Pastor'
    const mentorEmail = profile?.mentor_email || ''
    const now = new Date()
    const monthYear = now.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

    const subject = encodeURIComponent(`Monthly Mentor Report — ${name} — ${monthYear}`)

    let bodyLines: string[] = [
      `Dear ${mentor},`,
      ``,
      `Here is my monthly report for ${monthYear}.`,
      ``,
    ]

    SECTIONS.forEach((section, si) => {
      const sectionAnswers = section.questions
        .map((q, qi) => ({ q, a: getAnswer(si, qi).trim() }))
        .filter(({ a }) => a.length > 0)

      if (sectionAnswers.length === 0) return

      bodyLines.push(`— ${section.title.toUpperCase()} —`)
      bodyLines.push(``)
      sectionAnswers.forEach(({ q, a }) => {
        bodyLines.push(`» ${q}`)
        bodyLines.push(a)
        bodyLines.push(``)
      })
    })

    bodyLines.push(`In Christ,`)
    bodyLines.push(name)

    const body = encodeURIComponent(bodyLines.join('\n'))
    return `mailto:${mentorEmail}?subject=${subject}&body=${body}`
  }

  const sectionsWithAnswers = SECTIONS.filter((_, si) => sectionHasAnyAnswer(si)).length
  const canSubmit = totalAnswered() > 0

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </a>
        <Link href="/dashboard/ordinand" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← My Dashboard</Link>
      </header>

      <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-3xl mx-auto">

          <div className="mb-8">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Canadian Midwest District</p>
            <h1 className="text-4xl font-black" style={{ color: C.deepSea }}>Monthly Ordinand Report</h1>
            <p className="text-slate-500 font-medium mt-2 leading-relaxed">
              Fill in your responses below, then click <strong>Submit Monthly Report</strong> to open a pre-addressed email to your mentor. You are expected to answer <strong>at least one question from each section</strong> — you do not need to answer every question every month.
            </p>
          </div>

          {/* Mentor info card */}
          {!loading && (
            <div className={`rounded-2xl border px-6 py-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${profile?.mentor_email ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
              {profile?.mentor_name || profile?.mentor_email ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {profile.mentor_name && (
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Sending to</p>
                        <p className="font-bold text-slate-800">{profile.mentor_name}</p>
                      </div>
                    )}
                    {profile.mentor_email && (
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                        <p className="font-bold text-blue-700">{profile.mentor_email}</p>
                      </div>
                    )}
                  </div>
                  {!profile.mentor_email && (
                    <p className="text-xs font-bold text-amber-700">No mentor email on file — contact the District Office to have it added. You can still fill in your report and copy it manually.</p>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-amber-700">No mentor has been assigned yet. Contact the District Office. You can still fill in your report below.</p>
              )}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-6">
            {SECTIONS.map((section, si) => {
              const hasAnswer = sectionHasAnyAnswer(si)
              return (
                <div key={section.title} className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${hasAnswer ? 'border-green-200' : 'border-slate-200'}`}>
                  <div className={`px-8 py-5 border-b flex items-center justify-between gap-3 ${hasAnswer ? 'border-green-100 bg-green-50/40' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{section.icon}</span>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Section {si + 1} · Answer at least one</p>
                        <h2 className="font-black text-slate-900" style={{ fontSize: '1rem' }}>{section.title}</h2>
                      </div>
                    </div>
                    {hasAnswer && (
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full flex-shrink-0">✓ Answered</span>
                    )}
                  </div>
                  <div className="px-8 py-6 space-y-6">
                    {section.questions.map((q, qi) => {
                      const val = getAnswer(si, qi)
                      return (
                        <div key={qi}>
                          <div className="flex items-start gap-3 mb-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{qi + 1}</span>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{q}</p>
                          </div>
                          <textarea
                            value={val}
                            onChange={e => setAnswer(si, qi, e.target.value)}
                            placeholder="Your response (optional)…"
                            rows={3}
                            className={`w-full ml-9 px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-300 bg-slate-50 border rounded-xl outline-none resize-y transition-all focus:ring-4 focus:ring-blue-100 ${val.trim() ? 'border-blue-200 bg-white' : 'border-slate-200'}`}
                            style={{ width: 'calc(100% - 2.25rem)' }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Submit */}
          <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Ready to send?</p>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  {canSubmit
                    ? `${totalAnswered()} question${totalAnswered() !== 1 ? 's' : ''} answered across ${sectionsWithAnswers} section${sectionsWithAnswers !== 1 ? 's' : ''}. Click the button to open a pre-addressed email in your mail client.`
                    : 'Fill in at least one response above to enable the submit button.'}
                </p>
                {canSubmit && sectionsWithAnswers < SECTIONS.length && (
                  <p className="text-xs text-amber-600 font-bold mt-1">
                    Note: {SECTIONS.length - sectionsWithAnswers} section{SECTIONS.length - sectionsWithAnswers !== 1 ? 's have' : ' has'} no answers yet.
                  </p>
                )}
              </div>
              {canSubmit ? (
                <a
                  href={buildMailto()}
                  onClick={() => setSubmitted(true)}
                  className="inline-flex items-center gap-2 text-sm font-black px-6 py-3 rounded-xl whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: C.deepSea, color: C.white }}
                >
                  ✉ Submit Monthly Report
                </a>
              ) : (
                <span
                  className="inline-flex items-center gap-2 text-sm font-black px-6 py-3 rounded-xl whitespace-nowrap flex-shrink-0 opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: '#94a3b8', color: C.white }}
                >
                  ✉ Submit Monthly Report
                </span>
              )}
            </div>
            {submitted && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-bold text-green-700">✓ Your email client should have opened. You can add to or edit the message before sending.</p>
              </div>
            )}
          </div>

          <div className="mt-6 mb-10 flex justify-center">
            <Link href="/dashboard/ordinand"
              style={{ color: C.allianceBlue, fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none' }}>
              ← Back to My Dashboard
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
