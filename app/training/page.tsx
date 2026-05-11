// app/training/page.tsx
// Training videos — embedded YouTube clips (unlisted, hosted on the District channel)
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../utils/supabase/client'
import { logActivity } from '../../utils/logActivity'
import { C } from '../../lib/theme'

type Clip = { n: number; title: string; length: string; id: string }

const SECTIONS: { label: string; clips: Clip[] }[] = [
  {
    label: 'Getting Started',
    clips: [
      { n: 1, title: 'Welcome to the Ordination Portal', length: '1:51', id: '9nr3XlVtpaA' },
      { n: 2, title: 'Signing in with email OTP', length: '0:29', id: 'VCHu9TqUe2M' },
      { n: 3, title: 'Reading your dashboard', length: '0:31', id: '3vd-ui1sLMQ' },
    ],
  },
  {
    label: 'Submitting your work',
    clips: [
      { n: 4, title: 'Submit a book report', length: '0:28', id: 'eLDVBLi_wpc' },
      { n: 5, title: 'Submit a theological paper', length: '0:30', id: 't5cBwyyaBx8' },
      { n: 6, title: 'Submit a sermon', length: '0:32', id: 'Jtq8bv6saLU' },
    ],
  },
  {
    label: 'Feedback & profile',
    clips: [
      { n: 7, title: 'Reading your feedback', length: '0:29', id: '3UJ59wfh6Cg' },
      { n: 8, title: 'Re-submitting after revisions', length: '0:22', id: 'LOHjd2Y0l2Y' },
      { n: 9, title: 'Updating your profile', length: '0:21', id: 'cWSjZxBdO3E' },
    ],
  },
  {
    label: 'Mentor reporting',
    clips: [
      { n: 10, title: 'Your monthly mentor report', length: '0:33', id: 'e5tF4kNd6nY' },
    ],
  },
  {
    label: 'Pardington — the study assistant',
    clips: [
      { n: 11, title: 'Asking Pardington a study question', length: '0:28', id: 'nMWa6mr1TMQ' },
      { n: 12, title: 'What Pardington won’t do', length: '0:28', id: '7Pk28VmPmjc' },
    ],
  },
  {
    label: 'Cohort & interview',
    clips: [
      { n: 13, title: 'Finding upcoming cohort gatherings', length: '0:24', id: 'H3agcDO5HH4' },
      { n: 14, title: 'Preparing for oral examination', length: '0:36', id: 'PHlOgQe_i0s' },
      { n: 15, title: 'Tracking your progress', length: '0:29', id: 'xfDyGgjokeY' },
    ],
  },
]

export default function TrainingPage() {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/'
        return
      }
      setAuthed(true)
      setLoading(false)
      logActivity(user.id, 'process_guide', '/training', { kind: 'training_videos' })
    })
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
        Loading…
      </div>
    )
  }

  if (!authed) return null

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <main className="py-8 md:py-12 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <div className="mb-6">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">Training</p>
            <h1 className="text-4xl font-black mb-2" style={{ color: C.deepSea }}>How to Use the Portal</h1>
            <p className="text-slate-500 font-medium text-base leading-relaxed max-w-2xl">Fifteen short clips that walk through every part of the Ordination Portal — sign-in, dashboards, submitting work, reading feedback, Pardington, and oral exam prep. Watch them in any order; the whole library runs about eight minutes.</p>
          </div>

          {/* Unlisted-link sharing notice */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-8 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🔒</span>
            <div>
              <p className="font-black text-amber-900 text-sm mb-1">These videos are unlisted on YouTube</p>
              <p className="text-sm text-amber-800 font-medium leading-relaxed">They are only accessible through this page. Please don&rsquo;t share the direct YouTube links outside the District.</p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {SECTIONS.map(section => (
              <section key={section.label}>
                <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: C.allianceBlue }}>{section.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {section.clips.map(clip => (
                    <div key={clip.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${clip.id}?rel=0&modestbranding=1`}
                          title={`${clip.n}. ${clip.title}`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{String(clip.n).padStart(2, '0')} · {clip.length}</p>
                        </div>
                        <p className="font-bold text-slate-800 mt-1 leading-snug">{clip.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-12 text-center">
            <p className="text-xs text-slate-400 font-medium">Need something this library doesn&rsquo;t cover? <Link href="/handbook" className="underline hover:text-blue-600">Open the Handbook</Link> or message the District Office.</p>
          </div>

        </div>
      </main>
    </div>
  )
}
