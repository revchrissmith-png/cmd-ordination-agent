// app/components/NavBar.tsx
// Shared dashboard navigation bar — client component for auth state
'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../utils/supabase/client'
import { C } from '../../lib/theme'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  council: 'Council',
  ordinand: 'Ordinand',
  observer: 'Observer',
}

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? null)
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()
      if (profile?.roles) setRoles(profile.roles)
    }
    loadUser()
  }, [])

  const isAdmin = roles.includes('admin')
  const isCouncil = roles.includes('council')
  const isOrdinand = roles.includes('ordinand')
  const roleLabel = roles.map(r => ROLE_LABELS[r] || r).join(' · ')

  // Build nav links based on role
  const navLinks: { href: string; label: string; show: boolean }[] = [
    { href: '/dashboard', label: 'Home', show: true },
    { href: '/dashboard/admin', label: 'Admin', show: isAdmin },
    { href: '/dashboard/council', label: 'Grading', show: isCouncil || isAdmin },
    { href: '/dashboard/ordinand', label: 'Requirements', show: isOrdinand || isAdmin },
    { href: '/dashboard/study', label: 'Pardington', show: true },
    { href: '/handbook', label: 'Handbook', show: true },
  ]

  const visibleLinks = navLinks.filter(l => l.show)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname?.startsWith(href) ?? false
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="border-b shadow-sm" style={{ backgroundColor: C.deepSea, borderColor: C.allianceBlue }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + title */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0" style={{ textDecoration: 'none' }}>
            <img src="/cmd-logo.png" alt="CMD" className="h-8" />
            <span className="font-bold text-sm tracking-wide hidden sm:inline" style={{ color: C.white }}>
              CMD ORDINATION
            </span>
          </Link>

          {/* Center: Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {visibleLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  color: isActive(link.href) ? C.white : 'rgba(255,255,255,0.6)',
                  backgroundColor: isActive(link.href) ? 'rgba(255,255,255,0.15)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: User info + sign out */}
          <div className="hidden md:flex items-center gap-3">
            {roleLabel && (
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: C.allianceBlue, color: C.white, letterSpacing: '0.04em' }}
              >
                {roleLabel}
              </span>
            )}
            {email && (
              <span className="text-xs max-w-[160px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {email}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>

          {/* Mobile: Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg"
            style={{ color: C.white, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Toggle navigation menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex flex-col gap-1">
              {visibleLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-bold"
                  style={{
                    color: isActive(link.href) ? C.white : 'rgba(255,255,255,0.6)',
                    backgroundColor: isActive(link.href) ? 'rgba(255,255,255,0.15)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 pt-3 px-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                {roleLabel && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: C.allianceBlue, color: C.white }}
                  >
                    {roleLabel}
                  </span>
                )}
                {email && (
                  <p className="text-xs mt-1.5 truncate" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '200px' }}>
                    {email}
                  </p>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
