// Iteration: v3.0 - Alliance Blue design system
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase/client'
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

      if (prof) setProfile(prof)
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
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#90C8F0', fontSize: '0.78rem' }}>{user?.email}</span>
          <span style={{ backgroundColor: C.allianceBlue, color: C.white, fontSize: '0.68rem', fontWeight: 'bold', padding: '0.2rem 0.7rem', borderRadius: '20px', letterSpacing: '0.06em' }}>
            {profile ? roleLabel : 'NO PROFILE'}
          </span>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        <h2 style={{ color: C.deepSea, fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1.5rem', letterSpacing: '0.03em' }}>SELECT A MODULE</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>

          {/* Admin Card */}
          <div style={{ backgroundColor: C.white, borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: isAdmin ? `2px solid ${C.allianceBlue}` : '2px solid transparent', opacity: isAdmin ? 1 : 0.5, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>📋</div>
            <h3 style={{ color: C.deepSea, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem' }}>Admin Console</h3>
            <p style={{ color: '#666', fontSize: '0.85rem', flex: 1, margin: '0 0 1.2rem', lineHeight: 1.5 }}>Manage candidates and track District progress.</p>
            {isAdmin ? (
              <Link href="/dashboard/admin" style={{ backgroundColor: C.deepSea, color: C.white, textAlign: 'center', padding: '0.7rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
                OPEN MANAGER
              </Link>
            ) : (
              <div style={{ textAlign: 'center', padding: '0.7rem', color: '#aaa', fontWeight: 'bold', fontSize: '0.85rem', backgroundColor: C.cloudGray, borderRadius: '4px' }}>
                RESTRICTED
              </div>
            )}
          </div>

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

          {/* Study Agent Card */}
          <div style={{ backgroundColor: C.allianceBlue, borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,119,200,0.3)', border: '2px solid transparent', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>🤖</div>
            <h3 style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.5rem' }}>Study Agent</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', flex: 1, margin: '0 0 1.2rem', lineHeight: 1.5 }}>Access the AI theological study assistant.</p>
            <Link href="/dashboard/study" style={{ backgroundColor: C.deepSea, color: C.white, textAlign: 'center', padding: '0.7rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'none', letterSpacing: '0.04em' }}>
              LAUNCH AGENT
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}
