// app/components/ViewAsUserModal.tsx
// Shared "View as User" modal used on admin pages.
// Lets admins preview the portal as any ordinand or council member.
'use client'
import { useState, useEffect } from 'react'

interface User {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  status?: string
}

interface ViewAsUserModalProps {
  onClose: () => void
  ordinands: User[]
  councilMembers: User[]
  loading?: boolean
}

export default function ViewAsUserModal({ onClose, ordinands, councilMembers, loading }: ViewAsUserModalProps) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  // Escape key to close + body scroll lock
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = prev }
  }, [onClose])

  const filteredOrdinands = ordinands.filter(c =>
    c.status !== 'deleted' &&
    (`${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
  )
  const filteredCouncil = councilMembers.filter(m =>
    (`${m.first_name} ${m.last_name}`.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q))
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="View as user"
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#00426A' }}>View as User</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Choose a user to preview their portal experience.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 500, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <p style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>Loading…</p>}

          {!loading && filteredOrdinands.length > 0 && (
            <div>
              <p style={{ margin: 0, padding: '0.75rem 1.5rem 0.25rem', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Ordinands</p>
              {filteredOrdinands.map(c => (
                <button
                  key={c.id}
                  onClick={() => { window.location.href = `/dashboard/ordinand?viewAs=${c.id}` }}
                  style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{c.first_name} {c.last_name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{c.email}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && filteredCouncil.length > 0 && (
            <div>
              <p style={{ margin: 0, padding: '0.75rem 1.5rem 0.25rem', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Council Members</p>
              {filteredCouncil.map(m => (
                <button
                  key={m.id}
                  onClick={() => { window.location.href = `/dashboard/council?viewAs=${m.id}` }}
                  style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{m.first_name} {m.last_name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.email}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && filteredOrdinands.length === 0 && filteredCouncil.length === 0 && (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>No users found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
