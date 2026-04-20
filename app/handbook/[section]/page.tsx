// app/handbook/[section]/page.tsx
// CMD Ordination Handbook — individual section viewer with sidebar
// Public sections: no login required
// Portal-only sections: show login prompt if not authenticated
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../utils/supabase/client'
import { WIKI_SECTIONS, getSectionBySlug, getAdjacentSections, type ContentBlock } from '../content'
import { C } from '../../../lib/theme'

function renderBlock(block: ContentBlock, idx: number) {
  switch (block.type) {
    case 'p':
      return <p key={idx} className="text-sm text-slate-700 font-medium leading-relaxed mb-4">{block.text}</p>
    case 'ul':
      return (
        <ul key={idx} className="mb-4 space-y-1.5 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-2" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'callout': {
      const styles = {
        info:    'bg-blue-50 border-blue-200 text-blue-800',
        tip:     'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
      }
      const icons = { info: 'ℹ️', tip: '💡', warning: '⚠️' }
      return (
        <div key={idx} className={`rounded-2xl border px-5 py-4 mb-4 flex items-start gap-3 ${styles[block.variant]}`}>
          <span className="text-base flex-shrink-0 mt-0.5">{icons[block.variant]}</span>
          <p className="text-sm font-medium leading-relaxed">{block.text}</p>
        </div>
      )
    }
    case 'outcomes':
      return (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {block.items.map((item, i) => (
            <div key={i} className={`rounded-2xl border px-5 py-4 ${item.color}`}>
              <p className="text-xs font-black uppercase tracking-widest mb-1">{item.label}</p>
              <p className="text-xs font-medium leading-relaxed opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
      )
    case 'link':
      return (
        <a
          key={idx}
          href={block.href}
          target={block.external ? '_blank' : undefined}
          rel={block.external ? 'noopener noreferrer' : undefined}
          className="flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 mb-4 hover:bg-blue-100 transition-colors group no-underline"
        >
          <div>
            <p className="text-sm font-black text-blue-900">{block.label}</p>
            {block.description && <p className="text-xs font-medium text-blue-700 mt-0.5">{block.description}</p>}
          </div>
          <span className="text-blue-400 text-lg flex-shrink-0 group-hover:translate-x-1 transition-transform">
            {block.external ? '↗' : '→'}
          </span>
        </a>
      )
    default:
      return null
  }
}

function stripHeadingNumber(heading: string): string {
  return heading.replace(/^[A-Za-z0-9]+\.[\d]*\s*(?:—\s*)?/, '')
}

export default function HandbookSection() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [closedSubs, setClosedSubs] = useState<Set<string>>(new Set())

  const toggleSub = (id: string) => {
    setClosedSubs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const router = useRouter()
  const params = useParams()
  const slug = params && typeof params.section === 'string' ? params.section : ''

  const section = getSectionBySlug(slug)
  const { prev, next } = getAdjacentSections(slug)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!section) { router.replace('/handbook'); return }
  }, [slug])

  // Sections visible in the sidebar for this visitor
  const visibleSections = WIKI_SECTIONS.filter(s => s.isPublic || loggedIn)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading…
    </div>
  )

  if (!section) return null

  // Section requires login and user is not authenticated
  const accessDenied = !section.isPublic && !loggedIn

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/handbook" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Handbook</Link>
          {loggedIn ? (
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
              style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
              Sign Out
            </button>
          ) : (
            <Link href="/" style={{ backgroundColor: C.allianceBlue, color: C.white, padding: '0.3rem 0.9rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold', textDecoration: 'none' }}>
              Portal Login →
            </Link>
          )}
        </div>
      </header>

      <div className="flex min-h-screen">

        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white border-r border-slate-200 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Handbook Sections</p>
            <nav className="space-y-1">
              {visibleSections.map(sec => (
                <Link key={sec.slug} href={`/handbook/${sec.slug}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${sec.slug === slug ? 'text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                  style={sec.slug === slug ? { backgroundColor: C.deepSea } : {}}>
                  <span className="text-base flex-shrink-0">{sec.icon}</span>
                  <span className="leading-snug">{sec.title}</span>
                </Link>
              ))}
              {!loggedIn && (
                <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all">
                  <span className="text-base flex-shrink-0 opacity-50">🔒</span>
                  <span className="leading-snug">More in Portal</span>
                </Link>
              )}
            </nav>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-30" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <aside className="absolute left-0 top-[57px] bottom-0 w-72 bg-white border-r border-slate-200 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Handbook Sections</p>
                <nav className="space-y-1">
                  {visibleSections.map(sec => (
                    <Link key={sec.slug} href={`/handbook/${sec.slug}`}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${sec.slug === slug ? 'text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      style={sec.slug === slug ? { backgroundColor: C.deepSea } : {}}>
                      <span className="text-base flex-shrink-0">{sec.icon}</span>
                      <span>{sec.title}</span>
                    </Link>
                  ))}
                  {!loggedIn && (
                    <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all">
                      <span className="text-base flex-shrink-0 opacity-50">🔒</span>
                      <span>More in Portal</span>
                    </Link>
                  )}
                </nav>
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 py-8 px-5 sm:px-8 md:px-10 lg:px-12">
          <div className="max-w-2xl mx-auto">

            {/* Mobile: section menu button */}
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 mb-5 hover:border-slate-300 transition-colors">
              <span>☰</span> All Sections
            </button>

            {/* Access denied — portal-only section */}
            {accessDenied ? (
              <div className="text-center py-16">
                <span className="text-5xl mb-4 block">🔒</span>
                <h1 className="text-2xl font-black mb-2" style={{ color: C.deepSea }}>{section.icon} {section.title}</h1>
                <p className="text-slate-500 font-medium mb-6 max-w-md mx-auto">This section is available to ordinands, council members, and mentors with portal access. Sign in to continue.</p>
                <Link href="/" style={{ backgroundColor: C.allianceBlue, color: C.white, padding: '0.6rem 1.4rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }}>
                  Sign In to the Portal →
                </Link>
                <div className="mt-4">
                  <Link href="/handbook" className="text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors">← Back to Handbook</Link>
                </div>
              </div>
            ) : (
              <>
                {/* Section header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{section.icon}</span>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Handbook</p>
                      <h1 className="text-3xl font-black leading-tight" style={{ color: C.deepSea }}>{section.title}</h1>
                    </div>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed">{section.tagline}</p>

                  {/* In-section navigation */}
                  {section.subsections.length > 1 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {section.subsections.map(sub => (
                        <a key={sub.id} href={`#${sub.id}`}
                          onClick={() => setClosedSubs(prev => { const next = new Set(prev); next.delete(sub.id); return next })}
                          className="text-xs font-bold px-3 py-1.5 bg-white rounded-full border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer">
                          {stripHeadingNumber(sub.heading)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subsections */}
                <div className="space-y-3">
                  {section.subsections.map(sub => {
                    const isOpen = !closedSubs.has(sub.id)
                    return (
                      <div key={sub.id} id={sub.id} className="scroll-mt-24 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => toggleSub(sub.id)}
                          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        >
                          <h2 className="text-sm font-black" style={{ color: C.allianceBlue }}>
                            {stripHeadingNumber(sub.heading)}
                          </h2>
                          <span className="flex-shrink-0 text-slate-400 text-xs font-bold transition-transform duration-200" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block' }}>▾</span>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                            {sub.blocks.map((block, i) => renderBlock(block, i))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Portal CTA for public visitors */}
                {!loggedIn && (
                  <div className="mt-10 rounded-3xl p-6 text-center" style={{ backgroundColor: C.deepSea }}>
                    <p className="font-black text-white mb-1">Ready to begin your ordination journey?</p>
                    <p className="text-sm mb-4" style={{ color: '#90C8F0' }}>Ordinands, mentors, and council members access their full dashboard through the CMD Ordination Portal.</p>
                    <Link href="/" style={{ backgroundColor: C.allianceBlue, color: C.white, padding: '0.5rem 1.2rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }}>
                      Sign In to the Portal →
                    </Link>
                  </div>
                )}

                {/* Prev / Next navigation */}
                {(() => {
                  const visiblePrev = prev && (prev.isPublic || loggedIn) ? prev : null
                  const visibleNext = next && (next.isPublic || loggedIn) ? next : null
                  if (!visiblePrev && !visibleNext) return null
                  return (
                    <div className="flex gap-3 mt-12 pt-8 border-t border-slate-200">
                      {visiblePrev ? (
                        <Link href={`/handbook/${visiblePrev.slug}`}
                          className="flex-1 flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all group">
                          <span className="text-slate-300 group-hover:text-blue-500 font-bold transition-colors">←</span>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Previous</p>
                            <p className="text-sm font-black text-slate-700 group-hover:text-blue-700 transition-colors truncate">{visiblePrev.title}</p>
                          </div>
                        </Link>
                      ) : <div className="flex-1" />}
                      {visibleNext ? (
                        <Link href={`/handbook/${visibleNext.slug}`}
                          className="flex-1 flex items-center justify-end gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all group text-right">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Next</p>
                            <p className="text-sm font-black text-slate-700 group-hover:text-blue-700 transition-colors truncate">{visibleNext.title}</p>
                          </div>
                          <span className="text-slate-300 group-hover:text-blue-500 font-bold transition-colors">→</span>
                        </Link>
                      ) : <div className="flex-1" />}
                    </div>
                  )
                })()}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
