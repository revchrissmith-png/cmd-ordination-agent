// Iteration: v3.1 - Hide admin card from non-admins; auto-redirect ordinands
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../utils/supabase/client'
import { logActivity } from '../../utils/logActivity'
import Link from 'next/link'

const C = {
  allianceBlue: '#0077C8',
  deepSea: '#00426A',
  cloudGray: '#EAEAEE',
  white: '#ffffff',
}

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return; }
      setUser(authUser)

      // Lookup 1: Try by ID (Standard)
      let { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // Lookup 2: If ID fails, try by Email (Backup)
      if (!prof) {
        const { data: backupProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', authUser.email)
          .single()
        prof = backupProf
      }

      if (prof) {
        setProfile(prof)
        logActivity(authUser.id, 'login', '/dashboard', { roles: prof.roles })
        // Auto-redirect non-admin users directly to their dashboard
        const roles: string[] = prof?.roles ?? []
        if (roles.includes('ordinand') && !roles.includes('admin') && !roles.includes('council')) {
          router.replace('/dashboard/ordinand')
          return
        }
        if (roles.includes('council') && !roles.includes('admin')) {
          router.replace('/dashboard/council')
          return
        }
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Initializing Portal...
    </div>
  )

  const roles: string[] = profile?.roles ?? []
  const isAdmin   = roles.includes('admin')
  const isCouncil = roles.includes('council')
  const isOrdinand = roles.includes('ordinand')
  const roleLabel = roles.length > 0 ? roles.join(', ').toUpperCase() : 'NO ROLE'

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexShrink: 0 }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <span className="hidden sm:inline" style={{ color: '#90C8F0', fontSize: '0.78rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
          <span className="hidden sm:inline" style={{ backgroundColor: C.allianceBlue, color: C.white, fontSize: '0.68rem', fontWeight: 'bold', padding: '0.2rem 0.7rem', borderRadius: '20px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            {profile ? roleLabel : 'NO PROFILE'}
          </span>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── ALPHA BANNER — remove before public launch ── */}
      <div style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #F59E0B', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1rem' }}>⚗️</span>
        <span style={{ color: '#92400E', fontSize: '0.82rem', fontWeight: '700', letterSpacing: '0.02em' }}>
          Alpha Build · v0.3.0 · Testing in progress — please report any issues to the District Office
        </span>
      </div>
      {/* ── END ALPHA BANNER ── */}

      {/* Main content */}
      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        <h2 style={{ color: C.deepSea, fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1.5rem', letterSpacing: '0.03em' }}>SELECT A MODULE</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>

          {/* Admin Card — only visible to admins */}
          {isAdmin && (
            <div style={{ backgroundColor: C.white, borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: `2px solid ${C.allianceBlue}`, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>📋</div>
              <h3 style={{ color: C.deepSea, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem' }}>Admin Console</h3>
              <p style={{ color: '#666', fontSize: '0.85rem', flex: 1, margin: '0 0 1.2rem', lineHeight: 1.5 }}>Manage ordinands and track District progress.</p>
              <Link href="/dashboard/admin" style={{ backgroundColor: C.deepSea, color: C.white, textAlign: 'center', padding: '0.7rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
                OPEN MANAGER
              </Link>
            </div>
          )}

          {/* Council Grading Card */}
          {(isCouncil || isAdmin) && (
            <div style={{ backgroundColor: C.white, borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '2px solid transparent', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>⚖️</div>
              <h3 style={{ color: C.deepSea, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem' }}>Grading Queue</h3>
              <p style={{ color: '#666', fontSize: '0.85rem', flex: 1, margin: '0 0 1.2rem', lineHeight: 1.5 }}>Review and grade assigned submissions.</p>
              <Link href="/dashboard/council" style={{ backgroundColor: C.allianceBlue, color: C.white, textAlign: 'center', padding: '0.7rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
                OPEN QUEUE
              </Link>
            </div>
          )}

          {/* Requirements Card */}
          {(isOrdinand || isAdmin) && (
            <div style={{ backgroundColor: C.white, borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '2px solid transparent', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>✔️</div>
              <h3 style={{ color: C.deepSea, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem' }}>Requirements</h3>
              <p style={{ color: '#666', fontSize: '0.85rem', flex: 1, margin: '0 0 1.2rem', lineHeight: 1.5 }}>View your personalized checklist.</p>
              <Link href="/dashboard/ordinand" style={{ backgroundColor: C.deepSea, color: C.white, textAlign: 'center', padding: '0.7rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
                VIEW CHECKLIST
              </Link>
            </div>
          )}

          {/* Pardington Card */}
          <div style={{ backgroundColor: C.allianceBlue, borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,119,200,0.3)', border: '2px solid transparent', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <img src="/pardington-avatar.png" alt="Pardington" style={{ height: '42px' }} />
              <div>
                <div style={{ color: C.white, fontWeight: '900', fontSize: '0.95rem', letterSpacing: '0.04em', lineHeight: 1.1 }}>PARDINGTON</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.6rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Study Partner</div>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', flex: 1, margin: '0 0 1.2rem', lineHeight: 1.5 }}>Your AI theological study partner for Alliance theology and interview preparation.</p>
            <Link href="/dashboard/study" style={{ backgroundColor: C.deepSea, color: C.white, textAlign: 'center', padding: '0.7rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
              OPEN PARDINGTON
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
