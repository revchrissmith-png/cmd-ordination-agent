// app/dashboard/ordinand/process/page.tsx
// Static ordination process reference page — drawn from the CMD Ordination Handbook
'use client'
import Link from 'next/link'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
      <h2 className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: C.allianceBlue }}>{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 font-medium leading-relaxed">{value}</span>
    </div>
  )
}

export default function OrdinandProcessPage() {
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
                { icon: '🎤', number: '3', label: 'Sermons', sub: 'Full manuscript + recording' },
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
            <div className="space-y-0">
              {[
                { month: 'September', type: 'Online', detail: 'Virtual cohort gathering' },
                { month: 'November', type: 'Online', detail: 'Virtual cohort gathering' },
                { month: 'February', type: 'Online', detail: 'Virtual cohort gathering' },
                { month: 'June', type: 'In-Person', detail: 'Annual in-person cohort gathering (location varies; costs covered by your local church)' },
              ].map(item => (
                <div key={item.month} className="flex items-start gap-4 py-3.5 border-b border-slate-100 last:border-0">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm font-black" style={{ color: C.deepSea }}>{item.month}</span>
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mr-2 ${item.type === 'In-Person' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{item.type}</span>
                    <span className="text-sm text-slate-600 font-medium">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-amber-700 leading-relaxed">Attendance at all quarterly gatherings is expected. If you must miss one, notify the Chair of the Ordaining Council in advance and complete any required catch-up work.</p>
            </div>
          </Section>

          {/* Assignments */}
          <Section title="Your 17 Assignments">
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">Every ordinand completes exactly 17 assignments: 10 book reports, 4 theological papers, and 3 sermons. The specific paper and sermon topics depend on which topic your cohort has designated as the sermon topic.</p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">📚 Book Reports (10)</h3>
                <p className="text-sm text-slate-600 font-medium mb-3 leading-relaxed">One book per category, approximately two pages each, single-spaced. Focus on personal application, theological engagement, and connection to your current ministry context.</p>
                <div className="space-y-1.5">
                  {[
                    { cat: 'History', note: 'Choose 1 of 2 titles' },
                    { cat: 'Theology', note: 'Choose 2 of 3 titles' },
                    { cat: 'Deeper Life', note: 'Choose 1 of 2 titles' },
                    { cat: 'Missions', note: 'Choose 1 of 3 options' },
                    { cat: 'Holy Scripture', note: 'Choose 1 of 2 titles' },
                    { cat: 'Anthropology', note: 'Choose 2 of 3 titles' },
                    { cat: 'Disciple-Making', note: '1 required title' },
                    { cat: 'Specific Ministry Focus', note: 'Choose 1 book relevant to your field' },
                    { cat: 'C&MA Manual', note: 'No report required — read only' },
                    { cat: 'Bible (new translation)', note: 'No report required — read only' },
                  ].map(item => (
                    <div key={item.cat} className="flex items-center justify-between py-2 px-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-800">{item.cat}</span>
                      <span className="text-xs text-slate-400 font-medium">{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">📝 Theological Papers (4)</h3>
                <p className="text-sm text-slate-600 font-medium mb-3 leading-relaxed">10–12 pages each, written in response to specific questions for each topic. Each paper requires a self-assessment form to be completed and submitted alongside it. Writing in first person is acceptable and encouraged.</p>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 px-5 py-4">
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">You will write papers on four of the five theological topics. Your cohort's designated sermon topic is excluded from papers. The five topics are: <span style={{ color: C.deepSea }}>Christ-Centred Life and Ministry, Spirit-Empowered Life and Ministry, Mission-Focused Life and Ministry, The Scriptures,</span> and <span style={{ color: C.deepSea }}>Divine Healing.</span></p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">🎤 Sermons (3)</h3>
                <p className="text-sm text-slate-600 font-medium mb-3 leading-relaxed">Three sermons on your cohort's designated sermon topic. Each sermon must address one of the questions marked with an asterisk (*) in the assignment guide. Submit a full manuscript, not just an outline.</p>
                <div className="space-y-2 text-sm text-slate-600 font-medium">
                  <p className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 leading-relaxed">At the top of each manuscript include: the <strong>date and occasion</strong> (e.g. Sunday service, youth group), the <strong>theme</strong>, and the <strong>specific question being addressed</strong>.</p>
                  <p className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 leading-relaxed">Those in a primary teaching role should submit recordings from their weekly worship services. Others may record in alternate settings.</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Mentorship */}
          <Section title="Mentorship">
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">Mentorship is one of the most vital components of the ordination journey. You are matched with a mentor — an ordained pastor or experienced ministry worker who is not your direct supervisor.</p>
            <div className="space-y-0">
              <InfoRow label="Meeting frequency" value="Monthly, 60–90 minutes (in person or online)" />
              <InfoRow label="Your mentor's role" value="To listen, ask questions, offer challenge, and encourage growth — not to evaluate performance" />
              <InfoRow label="Your responsibility" value="Initiate meetings, come prepared with reflection on current assignments or ministry situations, be open to feedback and spiritual challenge" />
              <InfoRow label="Monthly reports" value="Your mentor submits a short reflective report each month via Moodle, noting growth areas, prayer needs, and any concerns" />
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
