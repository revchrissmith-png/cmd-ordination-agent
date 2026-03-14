// app/dashboard/ordinand/mentor-report/page.tsx
// Monthly ordinand report guide — to be completed and sent to mentor before each meeting
'use client'
import Link from 'next/link'

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
  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <Link href="/dashboard/ordinand/process" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Process Guide</Link>
      </header>

      <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-3xl mx-auto">

          <div className="mb-10">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Canadian Midwest District</p>
            <h1 className="text-4xl font-black" style={{ color: C.deepSea }}>Monthly Ordinand Report</h1>
            <p className="text-slate-500 font-medium mt-2 leading-relaxed">
              For each section, write a few sentences to a short paragraph addressing the questions. Send this to your mentor <strong>at least one week before</strong> your regular monthly check-in so it can be used as discussion points in your one-on-one.
            </p>
          </div>

          {/* Print/copy tip */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 mb-8 flex items-start gap-3">
            <span className="text-blue-500 text-lg mt-0.5">💡</span>
            <p className="text-sm text-blue-700 font-medium leading-relaxed">
              <span className="font-black">How to use this guide:</span> Copy the questions into an email or document, write your responses, and send it to your mentor before your meeting. You can also print this page and write by hand.
            </p>
          </div>

          <div className="space-y-6">
            {SECTIONS.map((section, si) => (
              <div key={section.title} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-xl">{section.icon}</span>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Section {si + 1}</p>
                    <h2 className="font-black text-slate-900" style={{ fontSize: '1rem' }}>{section.title}</h2>
                  </div>
                </div>
                <div className="px-8 py-6">
                  <ol className="space-y-4">
                    {section.questions.map((q, qi) => (
                      <li key={qi} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{qi + 1}</span>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{q}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Frequency</p>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Submit this report to your mentor monthly, at least one week before your scheduled meeting. Your mentor will use your responses as discussion points and will file a brief reflective report with the District Office following each meeting.
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <Link href="/dashboard/ordinand/process"
              style={{ backgroundColor: C.deepSea, color: C.white, padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none' }}>
              ← Back to Process Guide
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
