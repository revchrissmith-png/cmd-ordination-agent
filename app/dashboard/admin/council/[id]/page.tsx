// app/dashboard/admin/council/[id]/page.tsx
// Admin management page for an individual council member.
// Shows profile (editable), last login, grading assignment stats, and HTML email report.
'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../../utils/supabase/client'

const C = { allianceBlue: '#0077C8', deepSea: '#00426A', cloudGray: '#EAEAEE', white: '#ffffff' }

type Urgency = 'critical' | 'overdue' | 'pending' | 'awaiting' | 'graded'

type Assignment = {
  id: string
  reqId: string
  title: string
  type: string
  ordinandName: string
  ordinandEmail: string
  reqStatus: string
  submittedAt: string | null
  gradedAt: string | null
  overallRating: string | null
  urgency: Urgency
  daysWaiting: number | null
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

const CRITICAL_DAYS = 60
const OVERDUE_DAYS  = 30

function computeUrgency(submittedAt: string | null, gradedAt: string | null, reqStatus: string): Urgency {
  if (gradedAt || reqStatus === 'complete' || reqStatus === 'revision_required') return 'graded'
  if (!submittedAt) return 'awaiting'
  const days = daysSince(submittedAt) ?? 0
  if (days >= CRITICAL_DAYS) return 'critical'
  if (days >= OVERDUE_DAYS)  return 'overdue'
  return 'pending'
}

const URGENCY_CONFIG: Record<Urgency, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: '⚠️ Critical',  bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  overdue:  { label: '⏰ Overdue',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  pending:  { label: '📋 Pending',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  awaiting: { label: '⏳ Awaiting',  bg: 'bg-slate-50',  text: 'text-slate-500',  border: 'border-slate-200' },
  graded:   { label: '✅ Graded',    bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
}

const TYPE_LABEL: Record<string, string> = {
  book_report: 'Book Report',
  paper: 'Paper',
  sermon: 'Sermon',
}

export default function CouncilMemberManagePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [lastSignIn, setLastSignIn] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [message, setMessage] = useState({ text: '', type: '' })

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false)
  const [editFirst, setEditFirst] = useState('')
  const [editLast, setEditLast] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [isObserver, setIsObserver] = useState(false)

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailHtml, setEmailHtml] = useState('')
  const [copied, setCopied] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSendStatus, setEmailSendStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  function denyObserver(): boolean {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return true }
    return false
  }

  async function fetchData() {
    setLoading(true)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, roles, created_at')
      .eq('id', id)
      .single()
    setMember(profile)
    if (profile) {
      setEditFirst(profile.first_name || '')
      setEditLast(profile.last_name || '')
      setEditEmail(profile.email || '')
    }

    // Last login — via service-role API route
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const res = await fetch(`/api/admin/council-member-info?userId=${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const info = await res.json()
          setLastSignIn(info.last_sign_in_at)
        }
      }
    } catch {}

    // Grading assignments with full context
    const { data: gas } = await supabase
      .from('grading_assignments')
      .select(`
        id,
        ordinand_requirement_id,
        ordinand_requirements(
          id, status,
          requirement_templates(title, type),
          profiles!ordinand_id(full_name, email),
          submissions(submitted_at, grades(graded_at, overall_rating))
        )
      `)
      .eq('council_member_id', id)

    if (gas) {
      const mapped: Assignment[] = gas.map((ga: any) => {
        const req = ga.ordinand_requirements
        const tmpl = req?.requirement_templates
        const ordinand = req?.profiles
        const subs: any[] = Array.isArray(req?.submissions) ? req.submissions : req?.submissions ? [req.submissions] : []
        const latestSub = subs.sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
        const grades: any[] = latestSub ? (Array.isArray(latestSub.grades) ? latestSub.grades : latestSub.grades ? [latestSub.grades] : []) : []
        const latestGrade = grades[0] || null
        const submittedAt = latestSub?.submitted_at ?? null
        const gradedAt = latestGrade?.graded_at ?? null
        const reqStatus = req?.status ?? 'not_started'
        return {
          id: ga.id,
          reqId: req?.id ?? '',
          title: tmpl?.title ?? 'Unknown',
          type: tmpl?.type ?? '',
          ordinandName: ordinand?.full_name ?? 'Unknown',
          ordinandEmail: ordinand?.email ?? '',
          reqStatus,
          submittedAt,
          gradedAt,
          overallRating: latestGrade?.overall_rating ?? null,
          urgency: computeUrgency(submittedAt, gradedAt, reqStatus),
          daysWaiting: submittedAt && !gradedAt ? daysSince(submittedAt) : null,
        }
      })

      // Sort: critical first, then overdue, pending, awaiting, graded
      const order: Urgency[] = ['critical', 'overdue', 'pending', 'awaiting', 'graded']
      mapped.sort((a, b) => order.indexOf(a.urgency) - order.indexOf(b.urgency))
      setAssignments(mapped)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('roles').eq('id', user.id).single().then(({ data: myProfile }) => {
          const myRoles: string[] = (myProfile as any)?.roles ?? []
          setIsObserver(myRoles.includes('observer') && !myRoles.includes('admin'))
        })
      }
    })
  }, [id])

  async function handleSaveProfile() {
    if (denyObserver()) return
    setIsSavingProfile(true)
    const { data: { session } } = await supabase.auth.getSession()

    // Update name in profiles
    const { error: nameError } = await supabase
      .from('profiles')
      .update({ first_name: editFirst, last_name: editLast, full_name: `${editFirst} ${editLast}`.trim() })
      .eq('id', id)
    if (nameError) { flash('Error saving profile: ' + nameError.message, 'error'); setIsSavingProfile(false); return }

    // Update email via service-role API if changed
    if (editEmail.trim() && editEmail.trim() !== member?.email) {
      const res = await fetch('/api/admin/update-user-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId: id, email: editEmail.trim() }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        flash('Name saved, but email update failed: ' + error, 'error')
        setIsSavingProfile(false)
        fetchData()
        return
      }
    }

    flash('Profile updated.', 'success')
    setEditingProfile(false)
    fetchData()
    setIsSavingProfile(false)
  }

  function generateEmailHtml(): string {
    const name = member ? `${member.first_name} ${member.last_name}` : 'Council Member'
    const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    const critical = assignments.filter(a => a.urgency === 'critical')
    const overdue  = assignments.filter(a => a.urgency === 'overdue')
    const pending  = assignments.filter(a => a.urgency === 'pending')
    const totalActive = critical.length + overdue.length + pending.length

    function assignmentRow(a: Assignment): string {
      const days = a.daysWaiting !== null ? `${a.daysWaiting} day${a.daysWaiting !== 1 ? 's' : ''} ago` : '—'
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${a.ordinandName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${a.title}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;">${TYPE_LABEL[a.type] || a.type}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#94a3b8;font-size:13px;">${days}</td>
        </tr>`
    }

    function section(title: string, colour: string, items: Assignment[], note?: string): string {
      if (items.length === 0) return ''
      return `
        <div style="margin-bottom:28px;">
          <h2 style="font-size:15px;font-weight:800;color:${colour};margin:0 0 4px 0;letter-spacing:-0.01em;">${title}</h2>
          ${note ? `<p style="font-size:13px;color:#94a3b8;margin:0 0 10px 0;">${note}</p>` : '<div style="height:10px;"></div>'}
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Ordinand</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Assignment</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Type</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Submitted</th>
              </tr>
            </thead>
            <tbody>${items.map(assignmentRow).join('')}</tbody>
          </table>
        </div>`
    }

    const noOutstanding = totalActive === 0

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CMD Grading Update — ${today}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#00426A;padding:24px 32px;border-radius:12px 12px 0 0;">
          <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;opacity:0.7;">Canadian Midwest District</p>
          <p style="margin:4px 0 0 0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.02em;">Ordination Portal</p>
          <p style="margin:6px 0 0 0;color:#90C8F0;font-size:13px;font-weight:600;">Grading Assignment Update · ${today}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px 32px 24px 32px;">
          <p style="margin:0 0 16px 0;font-size:16px;color:#1e293b;line-height:1.6;">Dear ${name},</p>
          <p style="margin:0 0 24px 0;font-size:14px;color:#475569;line-height:1.7;">
            ${noOutstanding
              ? 'You have <strong>no outstanding grading assignments</strong> at this time. Thank you for your faithful service to our ordinands!'
              : `You currently have <strong>${totalActive} outstanding grading assignment${totalActive !== 1 ? 's' : ''}</strong> in the CMD Ordination Portal. Please review the details below and log in to complete your grading at your earliest convenience.`
            }
          </p>

          ${section('⚠️ Critical — Response Urgently Needed (60+ days)', '#dc2626', critical, 'These submissions have been waiting more than 60 days for your review. Please action these as a priority.')}
          ${section('⏰ Overdue (30–60 days)', '#d97706', overdue, 'These submissions are overdue. Please aim to complete your review soon.')}
          ${section('📋 Pending (less than 30 days)', '#2563eb', pending)}

          ${noOutstanding ? '' : `
          <div style="margin:28px 0 0 0;text-align:center;">
            <a href="https://cmd-ordination-agent.vercel.app/dashboard/council"
               style="display:inline-block;background:#00426A;color:#ffffff;font-weight:800;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
              Open My Grading Assignments →
            </a>
          </div>`}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            This message was sent by the CMD Ordination Portal on behalf of the Canadian Midwest District office.
            If you have questions about your assignments, please contact the district office directly.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  }

  function handleGenerateEmail() {
    setEmailHtml(generateEmailHtml())
    setShowEmailModal(true)
    setCopied(false)
    setEmailSendStatus('idle')
  }

  async function handleCopyHtml() {
    try {
      await navigator.clipboard.writeText(emailHtml)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      flash('Could not copy to clipboard — please select and copy manually.', 'error')
    }
  }

  async function handleSendEmail() {
    if (denyObserver()) return
    if (!member?.email || !emailHtml) return
    setSendingEmail(true)
    setEmailSendStatus('idle')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      const res = await fetch('/api/admin/send-council-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          to: member.email,
          toName: `${member.first_name} ${member.last_name}`,
          subject: `CMD Ordination Portal — Grading Assignment Update (${today})`,
          html: emailHtml,
        }),
      })
      const result = await res.json()
      if (result.sent) {
        setEmailSendStatus('sent')
      } else {
        setEmailSendStatus('error')
        flash('Failed to send email: ' + (result.reason || 'Unknown error'), 'error')
      }
    } catch {
      setEmailSendStatus('error')
      flash('Failed to send email. Please try again.', 'error')
    }
    setSendingEmail(false)
  }

  // Stats
  const stats = {
    total:    assignments.length,
    graded:   assignments.filter(a => a.urgency === 'graded').length,
    critical: assignments.filter(a => a.urgency === 'critical').length,
    overdue:  assignments.filter(a => a.urgency === 'overdue').length,
    pending:  assignments.filter(a => a.urgency === 'pending').length,
    awaiting: assignments.filter(a => a.urgency === 'awaiting').length,
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box', outline: 'none' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '5px' }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: C.allianceBlue, fontWeight: 'bold' }}>
      Loading…
    </div>
  )

  if (!member) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.cloudGray, fontFamily: 'Arial, sans-serif', color: '#666' }}>
      Council member not found.
    </div>
  )

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/handbook" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>📖 Handbook</Link>
          <Link href="/dashboard/admin" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Admin Console</Link>
        </div>
      </header>

      {/* Flash message */}
      {message.text && (
        <div style={{ margin: '1rem 1.5rem 0', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {message.text}
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Page title */}
        <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Council Member</p>
            <h1 style={{ margin: '4px 0 4px', fontSize: '2rem', fontWeight: 900, color: C.deepSea, letterSpacing: '-0.02em' }}>{member.first_name} {member.last_name}</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{member.email}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => setEditingProfile(!editingProfile)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: '1.5px solid #e2e8f0', backgroundColor: C.white, color: '#475569', cursor: 'pointer' }}>
              {editingProfile ? 'Cancel Edit' : '✏️ Edit Profile'}
            </button>
            <button onClick={handleGenerateEmail} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: 'none', backgroundColor: C.allianceBlue, color: C.white, cursor: 'pointer' }}>
              📧 Generate Report Email
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Profile card */}
            <div style={{ backgroundColor: C.white, borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.allianceBlue }}>Profile</p>

              {editingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>First Name</label>
                    <input style={inputStyle} value={editFirst} onChange={e => setEditFirst(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name</label>
                    <input style={inputStyle} value={editLast} onChange={e => setEditLast(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                  </div>
                  <button onClick={handleSaveProfile} disabled={isSavingProfile} style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: 'none', backgroundColor: isSavingProfile ? '#e2e8f0' : C.deepSea, color: isSavingProfile ? '#94a3b8' : C.white, cursor: 'pointer' }}>
                    {isSavingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <p style={{ ...labelStyle, margin: '0 0 2px' }}>Name</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{member.first_name} {member.last_name}</p>
                  </div>
                  <div>
                    <p style={{ ...labelStyle, margin: '0 0 2px' }}>Email</p>
                    <p style={{ margin: 0, fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>{member.email}</p>
                  </div>
                  <div>
                    <p style={{ ...labelStyle, margin: '0 0 2px' }}>Roles</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2px' }}>
                      {(member.roles || []).map((r: string) => (
                        <span key={r} style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: r === 'admin' ? '#eff6ff' : '#f0fdf4', color: r === 'admin' ? '#1d4ed8' : '#15803d', border: `1px solid ${r === 'admin' ? '#bfdbfe' : '#bbf7d0'}` }}>{r}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ ...labelStyle, margin: '0 0 2px' }}>Member Since</p>
                    <p style={{ margin: 0, fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>
                      {new Date(member.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Last login card */}
            <div style={{ backgroundColor: C.white, borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.allianceBlue }}>Portal Activity</p>
              <div>
                <p style={{ ...labelStyle, margin: '0 0 2px' }}>Last Sign-In</p>
                {lastSignIn ? (
                  <>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                      {new Date(lastSignIn).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                      {daysSince(lastSignIn)} day{daysSince(lastSignIn) !== 1 ? 's' : ''} ago
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, color: '#94a3b8', fontWeight: 600, fontStyle: 'italic', fontSize: '0.9rem' }}>Never signed in</p>
                )}
              </div>
            </div>

            {/* Stats card */}
            <div style={{ backgroundColor: C.white, borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.allianceBlue }}>Grading Summary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Total Assignments', value: stats.total, colour: '#1e293b' },
                  { label: '✅ Graded', value: stats.graded, colour: '#15803d' },
                  { label: '⚠️ Critical (60+ days)', value: stats.critical, colour: '#dc2626' },
                  { label: '⏰ Overdue (30–60 days)', value: stats.overdue, colour: '#d97706' },
                  { label: '📋 Pending (<30 days)', value: stats.pending, colour: '#2563eb' },
                  { label: '⏳ Awaiting Submission', value: stats.awaiting, colour: '#94a3b8' },
                ].map(({ label, value, colour }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{label}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: colour }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Right column: assignments list ── */}
          <div style={{ backgroundColor: C.white, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.allianceBlue }}>All Grading Assignments ({assignments.length})</p>
            </div>

            {assignments.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>No grading assignments yet.</p>
            ) : (
              <div>
                <table style={{ width: '100%', minWidth: '660px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      {['Status', 'Assignment', 'Type', 'Ordinand', 'Submitted', 'Graded'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => {
                      const uc = URGENCY_CONFIG[a.urgency]
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block' }}
                              className={`${uc.bg} ${uc.text} border ${uc.border}`}>
                              {uc.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <Link href={`/dashboard/council/grade/${a.id}`} style={{ fontWeight: 700, color: C.allianceBlue, fontSize: '0.9rem', textDecoration: 'none' }}>
                              {a.title}
                            </Link>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{TYPE_LABEL[a.type] || a.type}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{a.ordinandName}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{a.ordinandEmail}</p>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>
                            {a.submittedAt
                              ? new Date(a.submittedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                              : <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Not yet</span>}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {a.gradedAt ? (
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, color: '#15803d', textTransform: 'capitalize' }}>{a.overallRating}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(a.gradedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Email Report Modal ── */}
      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setShowEmailModal(false)}>
          <div style={{ backgroundColor: C.white, borderRadius: '16px', width: '100%', maxWidth: '820px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Generated Report Email</p>
                <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>For: {member.first_name} {member.last_name}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {emailSendStatus === 'sent' ? (
                  <span style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                    ✓ Email Sent!
                  </span>
                ) : (
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: 'none', backgroundColor: sendingEmail ? '#94a3b8' : C.deepSea, color: C.white, cursor: sendingEmail ? 'default' : 'pointer', transition: 'background 0.2s' }}>
                    {sendingEmail ? 'Sending…' : '📧 Send Email'}
                  </button>
                )}
                <button onClick={handleCopyHtml} style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #e2e8f0', backgroundColor: copied ? '#f0fdf4' : C.white, color: copied ? '#166534' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {copied ? '✓ Copied' : 'Copy HTML'}
                </button>
                <button onClick={() => setShowEmailModal(false)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: '1px solid #e2e8f0', backgroundColor: C.white, color: '#64748b', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            {/* Tabs: Preview / HTML */}
            <EmailModalContent emailHtml={emailHtml} />
          </div>
        </div>
      )}

    </div>
  )
}

function EmailModalContent({ emailHtml }: { emailHtml: string }) {
  const [tab, setTab] = useState<'preview' | 'html'>('preview')
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    fontWeight: 700,
    fontSize: '0.85rem',
    border: 'none',
    borderBottom: active ? '2px solid #0077C8' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? '#0077C8' : '#94a3b8',
    cursor: 'pointer',
  })
  return (
    <>
      <div style={{ padding: '0 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.25rem' }}>
        <button style={tabStyle(tab === 'preview')} onClick={() => setTab('preview')}>Preview</button>
        <button style={tabStyle(tab === 'html')} onClick={() => setTab('html')}>HTML Source</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem' }}>
        {tab === 'preview' ? (
          <iframe
            srcDoc={emailHtml}
            style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none', borderRadius: '8px' }}
            title="Email Preview"
          />
        ) : (
          <pre style={{ margin: 0, fontSize: '0.75rem', color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', minHeight: '500px' }}>
            {emailHtml}
          </pre>
        )}
      </div>
    </>
  )
}
