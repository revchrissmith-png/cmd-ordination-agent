// app/handbook/page.tsx
// CMD Ordination Handbook — landing page
// Public sections visible without login; portal sections require authentication
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../utils/supabase/client'
import { WIKI_SECTIONS } from './content'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

const ROLE_GUIDES = [
  {
    icon: '👤',
    role: 'Ordinand',
    desc: 'Track your journey, understand your assignments, and prepare for your interview',
    sections: ['journey', 'assignments', 'mentorship', 'interview'],
    color: 'border-blue-200 bg-blue-50/60',
    labelColor: 'text-blue-700',
  },
  {
    icon: '🧭',
    role: 'Mentor',
    desc: 'Understand your role, the monthly report process, and how to support your ordinand',
    sections: ['stakeholders', 'mentorship'],
    color: 'border-purple-200 bg-purple-50/60',
    labelColor: 'text-purple-700',
  },
  {
    icon: '⛪',
    role: 'Church Leader',
    desc: 'How to support your pastor through the ordination process and what is expected of your church',
    sections: ['stakeholders', 'journey'],
    color: 'border-green-200 bg-green-50/60',
    labelColor: 'text-green-700',
  },
  {
    icon: '⚖️',
    role: 'Council Member',
    desc: 'Your mandate, time commitments, and responsibilities in grading and discernment',
    sections: ['council', 'assignments', 'interview'],
    color: 'border-amber-200 bg-amber-50/60',
    labelColor: 'text-amber-700',
  },
]

export default function HandbookLanding() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
      setLoading(false)
    })
  }, [])

  // Sections visible to current visitor
  const visibleSections = loading
    ? []
    : WIKI_SECTIONS.filter(s => s.isPublic || loggedIn)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading…
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
          {loggedIn ? (
            <>
              <Link href="/dashboard" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Dashboard</Link>
              <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/" style={{ backgroundColor: C.allianceBlue, color: C.white, padding: '0.3rem 0.9rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold', textDecoration: 'none' }}>
              Portal Login →
            </Link>
          )}
        </div>
      </header>

      <main className="py-8 md:py-12 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <div className="mb-10">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Reference</p>
            <h1 className="text-4xl font-black mb-2" style={{ color: C.deepSea }}>Ordination Handbook</h1>
            <p className="text-slate-500 font-medium text-base leading-relaxed max-w-2xl">The complete guide to the CMD ordination process — for ordinands, mentors, council members, and church leaders. Version 2.0 · March 2026.</p>
          </div>

          {/* Who Are You */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7 mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: C.allianceBlue }}>Where would you like to start?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_GUIDES.map(guide => {
                const availableSections = guide.sections.filter(slug => {
                  const sec = WIKI_SECTIONS.find(s => s.slug === slug)
                  return sec && (sec.isPublic || loggedIn)
                })
                if (availableSections.length === 0) return null
                return (
                  <div key={guide.role} className={`rounded-2xl border p-5 ${guide.color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{guide.icon}</span>
                      <span className={`text-sm font-black uppercase tracking-widest ${guide.labelColor}`}>{guide.role}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">{guide.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSections.map(slug => {
                        const sec = WIKI_SECTIONS.find(s => s.slug === slug)
                        if (!sec) return null
                        return (
                          <Link key={slug} href={`/handbook/${slug}`}
                            className="text-xs font-bold px-3 py-1.5 bg-white rounded-full border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors">
                            {sec.icon} {sec.title}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* All Sections */}
          <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: C.allianceBlue }}>All Sections</h2>
          <div className="space-y-2">
            {visibleSections.map((section) => (
              <Link key={section.slug} href={`/handbook/${section.slug}`}
                className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-6 py-4 hover:border-blue-200 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-4">
                  <span className="text-2xl flex-shrink-0">{section.icon}</span>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{section.title}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{section.tagline}</p>
                  </div>
                </div>
                <span className="text-slate-300 group-hover:text-blue-500 font-bold transition-colors flex-shrink-0 ml-4">→</span>
              </Link>
            ))}
            {!loggedIn && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 border-dashed rounded-2xl px-6 py-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl flex-shrink-0 opacity-40">🔒</span>
                  <div>
                    <p className="font-bold text-slate-400">Additional sections available in the Portal</p>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">Council responsibilities and appendices require portal access</p>
                  </div>
                </div>
                <Link href="/" className="text-xs font-bold px-3 py-1.5 bg-white rounded-full border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700 transition-colors flex-shrink-0 ml-4">
                  Login →
                </Link>
              </div>
            )}
          </div>

          {/* Public footer CTA */}
          {!loggedIn && (
            <div className="mt-10 rounded-3xl p-7 text-center" style={{ backgroundColor: C.deepSea }}>
              <p className="font-black text-white text-lg mb-1">Are you an ordinand, mentor, or council member?</p>
              <p className="text-sm mb-4" style={{ color: '#90C8F0' }}>Access your personalized dashboard, submit assignments, and track your progress in the CMD Ordination Portal.</p>
              <Link href="/" style={{ backgroundColor: C.allianceBlue, color: C.white, padding: '0.6rem 1.4rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }}>
                Sign In to the Portal →
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
