// app/dashboard/ordinand/profile/page.tsx
// Ordinand profile page — view and edit personal details
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../utils/supabase/client'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

export default function OrdinandProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [cohort, setCohort] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, email, cohort_id, cohorts(year, season, sermon_topic)')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof)
        setFullName(prof.full_name || '')
        setCohort(prof.cohorts)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setSaveMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id)

    if (error) {
      setSaveMessage('Could not save changes. Please try again.')
    } else {
      setProfile({ ...profile, full_name: fullName })
      setSaveMessage('Changes saved.')
      setEditing(false)
    }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading your profile…
    </div>
  )

  const sermonTopicLabel: Record<string, string> = {
    christ_centred:   'Christ-Centred Life and Ministry',
    spirit_empowered: 'Spirit-Empowered Life and Ministry',
    mission_focused:  'Mission-Focused Life and Ministry',
    scripture:        'The Scriptures',
    divine_healing:   'Divine Healing',
  }

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <img src="https://i.imgur.com/ZHqDQJC.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/ordinand" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← My Dashboard</Link>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20">
        <div className="max-w-2xl mx-auto">

          <div className="mb-10">
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">My Account</p>
            <h1 className="text-4xl font-black" style={{ color: C.deepSea }}>Profile</h1>
          </div>

          {/* Personal Details Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: C.allianceBlue }}>Personal Details</h2>
              {!editing && (
                <button
                  onClick={() => { setEditing(true); setSaveMessage('') }}
                  className="text-xs font-bold px-4 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-0">
              {/* Name row */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-4 border-b border-slate-100">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-32 flex-shrink-0 pt-0.5">Name</span>
                {editing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="text-sm font-medium text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 outline-none focus:border-blue-400"
                    placeholder="Your full name"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm text-slate-800 font-medium">{profile?.full_name || <span className="text-slate-400 italic">Not set</span>}</span>
                )}
              </div>

              {/* Email row */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-4 border-b border-slate-100">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-32 flex-shrink-0 pt-0.5">Email</span>
                <span className="text-sm text-slate-600 font-medium">{profile?.email}</span>
              </div>

              {/* Cohort row */}
              {cohort && (
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-4 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-32 flex-shrink-0 pt-0.5">Cohort</span>
                  <span className="text-sm text-slate-800 font-medium capitalize">{cohort.season} {cohort.year}</span>
                </div>
              )}

              {/* Sermon topic row */}
              {cohort?.sermon_topic && (
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest sm:w-32 flex-shrink-0 pt-0.5">Sermon Topic</span>
                  <span className="text-sm text-slate-800 font-medium">{sermonTopicLabel[cohort.sermon_topic] || cohort.sermon_topic}</span>
                </div>
              )}
            </div>

            {/* Save / Cancel buttons */}
            {editing && (
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ backgroundColor: saving ? '#aaa' : C.deepSea }}
                  className="text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setEditing(false); setFullName(profile?.full_name || ''); setSaveMessage('') }}
                  className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {saveMessage && (
              <p className={`text-sm font-bold mt-4 ${saveMessage.includes('Could not') ? 'text-red-500' : 'text-green-600'}`}>
                {saveMessage}
              </p>
            )}
          </div>

          {/* Info note */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-8 py-6">
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: C.allianceBlue }}>Need to update your email or cohort?</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Email address and cohort assignment can only be changed by an administrator. Contact the CMD District Office if any of your details are incorrect.</p>
          </div>

        </div>
      </main>
    </div>
  )
}
