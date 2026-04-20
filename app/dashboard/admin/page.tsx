// Iteration: v2.2 - Alliance Blue design system
// Tabs: Council Members | Cohorts | Candidates
'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../utils/supabase/client'
import Link from 'next/link'
import BetaBanner from '../../components/BetaBanner'
import ViewAsUserModal from '../../components/ViewAsUserModal'
import { C } from '../../../lib/theme'

type Tab = 'council' | 'cohorts' | 'candidates' | 'calendar' | 'activity'

const TOPICS = [
  { value: 'christ_centred',   label: 'Christ-Centred Life and Ministry' },
  { value: 'spirit_empowered', label: 'Spirit-Empowered Life and Ministry' },
  { value: 'mission_focused',  label: 'Mission-Focused Life and Ministry' },
  { value: 'scripture',        label: 'The Scriptures' },
  { value: 'divine_healing',   label: 'Divine Healing' },
]

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-blue-100 text-blue-700',
  council: 'bg-purple-100 text-purple-700',
  ordinand:'bg-slate-100 text-slate-600',
}

const VALID_TABS: Tab[] = ['council', 'cohorts', 'candidates', 'calendar', 'activity']

function AdminPageContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams?.get('tab')
    return (t && VALID_TABS.includes(t as Tab)) ? t as Tab : 'council'
  })
  const [message, setMessage] = useState({ text: '', type: '' })

  const [councilMembers, setCouncilMembers] = useState<any[]>([])
  const [councilLoading, setCouncilLoading] = useState(true)
  const [newCouncilEmail, setNewCouncilEmail] = useState('')
  const [newCouncilFirst, setNewCouncilFirst] = useState('')
  const [newCouncilLast, setNewCouncilLast] = useState('')
  const [newCouncilRoleMode, setNewCouncilRoleMode] = useState<'council' | 'council_admin' | 'admin_only'>('council')
  const [isAddingCouncil, setIsAddingCouncil] = useState(false)

  const [cohorts, setCohorts] = useState<any[]>([])
  const [cohortsLoading, setCohortsLoading] = useState(true)
  const [newCohortName, setNewCohortName] = useState('')
  const [newCohortYear, setNewCohortYear] = useState(new Date().getFullYear().toString())
  const [newCohortSeason, setNewCohortSeason] = useState<'spring' | 'fall'>('fall')
  const [newCohortSermonTopic, setNewCohortSermonTopic] = useState('christ_centred')
  const [newCohortDueDate, setNewCohortDueDate] = useState(() => {
    const y = new Date().getFullYear()
    return `${y}-07-31` // default: fall due date
  })
  const [isAddingCohort, setIsAddingCohort] = useState(false)
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null)
  const [editCohortName, setEditCohortName] = useState('')
  const [editCohortYear, setEditCohortYear] = useState('')
  const [editCohortSeason, setEditCohortSeason] = useState<'spring' | 'fall'>('fall')
  const [editCohortSermonTopic, setEditCohortSermonTopic] = useState('')
  const [editCohortDueDate, setEditCohortDueDate] = useState('')
  const [isSavingCohort, setIsSavingCohort] = useState(false)
  const [deletingCohortId, setDeletingCohortId] = useState<string | null>(null)

  const [events, setEvents] = useState<any[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [newEventAllCohorts, setNewEventAllCohorts] = useState(true)
  const [newEventCohorts, setNewEventCohorts] = useState<string[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventType, setNewEventType] = useState<'online' | 'in_person'>('online')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventNotes, setNewEventNotes] = useState('')
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [newEventTemplate, setNewEventTemplate] = useState('')
  const [editingEvent, setEditingEvent] = useState<any>(null)

  const [templates, setTemplates] = useState<any[]>([])
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const [candidates, setCandidates] = useState<any[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(true)
  const [newCandidateEmail, setNewCandidateEmail] = useState('')
  const [newCandidateFirst, setNewCandidateFirst] = useState('')
  const [newCandidateLast, setNewCandidateLast] = useState('')
  const [newCandidateCohort, setNewCandidateCohort] = useState('')
  const [newCandidateMentorName, setNewCandidateMentorName] = useState('')
  const [newCandidateMentorEmail, setNewCandidateMentorEmail] = useState('')
  const [isAddingCandidate, setIsAddingCandidate] = useState(false)
  const [autoAssign, setAutoAssign] = useState(true)

  const [archiveTarget, setArchiveTarget] = useState<any>(null)
  const [archiveStep, setArchiveStep] = useState<'action' | 'report' | null>(null)
  const [archiveMode, setArchiveMode] = useState<'delete' | 'complete' | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [reportComingSoon, setReportComingSoon] = useState(false)

  const [activityLogs, setActivityLogs]     = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  const [isObserver, setIsObserver] = useState(false)
  const [showViewAs, setShowViewAs] = useState(false)

  function flash(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  function denyObserver(): boolean {
    if (isObserver) { flash('Observer accounts cannot make changes to the portal.', 'error'); return true }
    return false
  }

  async function fetchCouncil() {
    setCouncilLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .contains('roles', ['council'])
      .order('last_name', { ascending: true })
    if (!error) setCouncilMembers(data || [])
    setCouncilLoading(false)
  }

  async function fetchCohorts() {
    setCohortsLoading(true)
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .order('year', { ascending: false })
    if (!error) setCohorts(data || [])
    setCohortsLoading(false)
  }

  async function fetchEvents() {
    setEventsLoading(true)
    const { data, error } = await supabase
      .from('cohort_events')
      .select('*, cohort_ids, requirement_templates!linked_template_id(id, title, type)')
      .order('event_date', { ascending: true })
    if (!error) setEvents(data || [])
    setEventsLoading(false)
  }

  async function fetchTemplates() {
    const { data } = await supabase
      .from('requirement_templates')
      .select('id, type, topic, book_category, title')
      .order('display_order', { ascending: true })
    setTemplates(data || [])
  }

  async function fetchCandidates() {
    setCandidatesLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, cohorts(name)')
      .contains('roles', ['ordinand'])
      .neq('status', 'deleted')
      .order('last_name', { ascending: true })
    if (!error) setCandidates(data || [])
    setCandidatesLoading(false)
  }

  async function fetchActivity() {
    setActivityLoading(true)
    const { data } = await supabase
      .from('activity_logs')
      .select('id, event_type, page, metadata, created_at, profiles(first_name, last_name, email, roles)')
      .order('created_at', { ascending: false })
      .limit(200)
    setActivityLogs(data || [])
    setActivityLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('roles').eq('id', user.id).single().then(({ data: myProfile }) => {
          const myRoles: string[] = (myProfile as any)?.roles ?? []
          setIsObserver(myRoles.includes('observer') && !myRoles.includes('admin'))
        })
      }
    })
    fetchCouncil()
    fetchCohorts()
    fetchCandidates()
    fetchEvents()
    fetchTemplates()
  }, [])

  async function handleAddCouncil(e: React.FormEvent) {
    e.preventDefault()
    if (denyObserver()) return
    setIsAddingCouncil(true)
    const roles = newCouncilRoleMode === 'council_admin' ? ['council', 'admin']
      : newCouncilRoleMode === 'admin_only' ? ['admin']
      : ['council']

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { flash('Session expired — please refresh and try again.', 'error'); setIsAddingCouncil(false); return }

    const res = await fetch('/api/admin/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        email: newCouncilEmail,
        firstName: newCouncilFirst,
        lastName: newCouncilLast,
        roles,
      }),
    })
    const result = await res.json()

    if (!res.ok) { flash('Error: ' + result.error, 'error') }
    else {
      const roleDesc = newCouncilRoleMode === 'council_admin' ? 'council + admin' : newCouncilRoleMode === 'admin_only' ? 'admin only' : 'council'
      flash(`${newCouncilFirst} ${newCouncilLast} added as ${roleDesc}.`, 'success')
      setNewCouncilEmail(''); setNewCouncilFirst(''); setNewCouncilLast(''); setNewCouncilRoleMode('council')
      fetchCouncil()
    }
    setIsAddingCouncil(false)
  }

  async function handleToggleGradingType(member: any, type: string) {
    if (denyObserver()) return
    const current: string[] | null = member.grading_types
    let next: string[] | null
    if (!current) {
      // Currently unrestricted — restrict to all except toggled type
      next = ['book_report', 'paper', 'sermon'].filter(t => t !== type)
    } else if (current.includes(type)) {
      const removed = current.filter(t => t !== type)
      next = removed.length === 0 ? ['book_report', 'paper', 'sermon'] : removed
    } else {
      const added = [...current, type]
      next = added.length === 3 ? null : added
    }
    const { error } = await supabase.from('profiles').update({ grading_types: next }).eq('id', member.id)
    if (error) { flash('Error: ' + error.message, 'error') }
    else { fetchCouncil() }
  }

  async function handleRemoveCouncil(member: any) {
    if (denyObserver()) return
    const name = `${member.first_name} ${member.last_name}`
    const hasAdmin = (member.roles || []).includes('admin')
    const confirmMsg = hasAdmin
      ? `Remove ${name} from the Ordaining Council?\n\nThey will keep their admin role. Existing grading assignments remain until manually reassigned.`
      : `Remove ${name} from the Ordaining Council?\n\nThis changes their role to ordinand. Existing grading assignments remain until manually reassigned.`
    if (!confirm(confirmMsg)) return
    const newRoles = (member.roles || []).filter((r: string) => r !== 'council')
    const finalRoles = newRoles.length > 0 ? newRoles : ['ordinand']
    const { error } = await supabase.from('profiles').update({ roles: finalRoles }).eq('id', member.id)
    if (error) { flash('Error: ' + error.message, 'error') }
    else { flash(`${name} removed from council.`, 'success'); fetchCouncil() }
  }

  function autoComputeDueDate(season: string, year: string) {
    const y = parseInt(year) || new Date().getFullYear()
    return season === 'spring' ? `${y}-02-28` : `${y}-07-31`
  }

  async function handleAddCohort(e: React.FormEvent) {
    e.preventDefault()
    if (denyObserver()) return
    setIsAddingCohort(true)
    const name = newCohortName.trim() || `${newCohortSeason.charAt(0).toUpperCase() + newCohortSeason.slice(1)} ${newCohortYear}`
    const { error } = await supabase.from('cohorts').insert([{
      name, year: parseInt(newCohortYear), season: newCohortSeason, sermon_topic: newCohortSermonTopic,
      assignment_due_date: newCohortDueDate || null,
    }])
    if (error) { flash('Error: ' + error.message, 'error') }
    else { flash(`Cohort "${name}" created.`, 'success'); setNewCohortName(''); setNewCohortDueDate(autoComputeDueDate(newCohortSeason, newCohortYear)); fetchCohorts() }
    setIsAddingCohort(false)
  }

  function startEditCohort(c: any) {
    setEditingCohortId(c.id)
    setEditCohortName(c.name)
    setEditCohortYear(String(c.year))
    setEditCohortSeason(c.season)
    setEditCohortSermonTopic(c.sermon_topic)
    setEditCohortDueDate(c.assignment_due_date || '')
  }

  async function handleSaveCohort() {
    if (denyObserver()) return
    if (!editingCohortId) return
    setIsSavingCohort(true)
    const { error } = await supabase.from('cohorts').update({
      name: editCohortName.trim(),
      year: parseInt(editCohortYear),
      season: editCohortSeason,
      sermon_topic: editCohortSermonTopic,
      assignment_due_date: editCohortDueDate || null,
    }).eq('id', editingCohortId)
    if (error) { flash('Error: ' + error.message, 'error') }
    else { flash('Cohort updated.', 'success'); setEditingCohortId(null); fetchCohorts() }
    setIsSavingCohort(false)
  }

  async function handleDeleteCohort(id: string) {
    if (denyObserver()) return
    const { error } = await supabase.from('cohorts').delete().eq('id', id)
    if (error) { flash('Cannot delete: ' + error.message, 'error') }
    else { flash('Cohort deleted.', 'success'); setDeletingCohortId(null); fetchCohorts() }
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault()
    if (denyObserver()) return
    if (!newCandidateCohort) { flash('Please select a cohort before adding an ordinand.', 'error'); return }
    setIsAddingCandidate(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { flash('Session expired — please refresh and try again.', 'error'); setIsAddingCandidate(false); return }

    const res = await fetch('/api/admin/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        email: newCandidateEmail,
        firstName: newCandidateFirst,
        lastName: newCandidateLast,
        cohortId: newCandidateCohort,
        mentorName: newCandidateMentorName.trim() || null,
        mentorEmail: newCandidateMentorEmail.trim() || null,
        roles: ['ordinand'],
      }),
    })
    const result = await res.json()

    if (!res.ok) { flash('Error: ' + result.error, 'error') }
    else {
      const count = result.requirementsCreated ?? '?'
      if (result.warning) flash(result.warning, 'error')
      setNewCandidateEmail(''); setNewCandidateFirst(''); setNewCandidateLast(''); setNewCandidateCohort(''); setNewCandidateMentorName(''); setNewCandidateMentorEmail('')
      fetchCandidates()

      if (autoAssign && result.userId) {
        const { data: { session } } = await supabase.auth.getSession()
        const assignRes = await fetch('/api/admin/auto-assign-graders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ ordinand_id: result.userId }),
        })
        const assignResult = await assignRes.json()
        if (assignRes.ok) {
          flash(`${newCandidateFirst || 'Ordinand'} registered with ${count} requirements — ${assignResult.assigned} graders auto-assigned.`, 'success')
        } else {
          flash(`${newCandidateFirst || 'Ordinand'} registered with ${count} requirements. Auto-assign failed — assign graders manually.`, 'error')
        }
      } else {
        flash(`${newCandidateFirst} ${newCandidateLast} registered with ${count} requirements generated.`, 'success')
      }
    }
    setIsAddingCandidate(false)
  }

  async function handleArchiveAction() {
    if (denyObserver()) return
    if (!archiveTarget || !archiveMode) return
    setIsArchiving(true)
    const { error } = await supabase.from('profiles')
      .update({ status: archiveMode === 'delete' ? 'deleted' : 'completed', status_changed_at: new Date().toISOString() })
      .eq('id', archiveTarget.id)
    setIsArchiving(false)
    if (error) { flash('Error: ' + error.message, 'error'); return }
    const name = `${archiveTarget.first_name} ${archiveTarget.last_name}`
    flash(archiveMode === 'delete' ? `${name} has been removed from the system.` : `${name} has been marked as complete.`, 'success')
    setArchiveTarget(null); setArchiveStep(null); setArchiveMode(null); setReportComingSoon(false)
    fetchCandidates()
  }

  function insertMd(prefix: string, suffix: string, placeholder: string) {
    const ta = notesRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = ta.value.substring(start, end) || placeholder
    setNewEventNotes(ta.value.substring(0, start) + prefix + sel + suffix + ta.value.substring(end))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length + sel.length)
    })
  }

  function insertLink() {
    const ta = notesRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = ta.value.substring(start, end) || 'Link Text'
    const insert = `[${sel}](https://)`
    setNewEventNotes(ta.value.substring(0, start) + insert + ta.value.substring(end))
    requestAnimationFrame(() => {
      ta.focus()
      const urlStart = start + 1 + sel.length + 2
      ta.setSelectionRange(urlStart, urlStart + 8)
    })
  }

  function insertBullet() {
    const ta = notesRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const val = ta.value
    // Find the beginning of the first selected line
    const lineStart = val.lastIndexOf('\n', start - 1) + 1
    if (start === end) {
      // No selection — prepend bullet on current line
      const newVal = val.substring(0, lineStart) + '- ' + val.substring(lineStart)
      setNewEventNotes(newVal)
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2) })
    } else {
      // Selection — bullet every line in selection
      const selectedText = val.substring(lineStart, end)
      const bulleted = selectedText.split('\n').map(line => '- ' + line).join('\n')
      const newVal = val.substring(0, lineStart) + bulleted + val.substring(end)
      setNewEventNotes(newVal)
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart, lineStart + bulleted.length) })
    }
  }

  function startEditEvent(ev: any) {
    setEditingEvent(ev)
    if (ev.cohort_ids && ev.cohort_ids.length > 0) {
      setNewEventAllCohorts(false)
      setNewEventCohorts(ev.cohort_ids)
    } else {
      setNewEventAllCohorts(true)
      setNewEventCohorts([])
    }
    setNewEventTitle(ev.title)
    setNewEventDate(ev.event_date)
    setNewEventType(ev.event_type)
    setNewEventLocation(ev.location ?? '')
    setNewEventNotes(ev.notes ?? '')
    setNewEventTemplate(ev.linked_template_id ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingEvent(null)
    setNewEventAllCohorts(true); setNewEventCohorts([])
    setNewEventTitle(''); setNewEventDate(''); setNewEventLocation(''); setNewEventNotes(''); setNewEventTemplate('')
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (denyObserver()) return
    setIsAddingEvent(true)
    const selectedCohortIds = newEventAllCohorts ? null : (newEventCohorts.length > 0 ? newEventCohorts : null)
    const payload = {
      cohort_ids: selectedCohortIds,
      title: newEventTitle.trim(),
      event_date: newEventDate,
      event_type: newEventType,
      location: newEventLocation.trim() || null,
      notes: newEventNotes.trim() || null,
      linked_template_id: newEventTemplate || null,
    }
    let error: any
    if (editingEvent) {
      const res = await supabase.from('cohort_events').update(payload).eq('id', editingEvent.id)
      error = res.error
    } else {
      const res = await supabase.from('cohort_events').insert([payload])
      error = res.error
    }
    if (error) { flash('Error: ' + error.message, 'error') }
    else {
      flash(editingEvent ? 'Event updated.' : 'Event added to calendar.', 'success')
      setNewEventAllCohorts(true); setNewEventCohorts([])
      setNewEventTitle(''); setNewEventDate(''); setNewEventLocation(''); setNewEventNotes(''); setNewEventTemplate('')
      setEditingEvent(null)
      fetchEvents()
    }
    setIsAddingEvent(false)
  }

  async function handleDeleteEvent(id: string, title: string) {
    if (denyObserver()) return
    if (!confirm(`Remove "${title}" from the calendar?`)) return
    const { error } = await supabase.from('cohort_events').delete().eq('id', id)
    if (error) { flash('Error: ' + error.message, 'error') }
    else { flash('Event removed.', 'success'); fetchEvents() }
  }

  function topicLabel(value: string) { return TOPICS.find(t => t.value === value)?.label ?? value }

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
  const labelClass = "block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5"

  return (
    <div style={{ backgroundColor: C.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* Brand header */}
      <header style={{ backgroundColor: C.deepSea, borderBottom: `4px solid ${C.allianceBlue}`, padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/cmd-logo.png" alt="CMD Logo" style={{ height: '35px' }} />
          <span style={{ color: C.white, fontWeight: 'bold', fontSize: '1rem', letterSpacing: '0.05em' }}>CMD PORTAL</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/handbook" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>📖 Handbook</Link>
          <button onClick={() => setShowViewAs(true)} style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>👁 View as User</button>
          <Link href="/dashboard" style={{ color: '#90C8F0', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </header>

      <BetaBanner />

    <main className="py-6 md:py-10 px-5 sm:px-10 md:px-14 lg:px-20 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <h1 className="text-2xl font-black mt-1" style={{ color: C.deepSea }}>Admin Console</h1>
          {message.text && (
            <div className={`px-5 py-3 rounded-xl text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {(['council','cohorts','candidates','calendar','activity'] as Tab[]).map(key => (
            <button key={key} onClick={() => { setActiveTab(key); if (key === 'activity') fetchActivity() }}
              style={activeTab === key
                ? { backgroundColor: C.deepSea, color: C.white, padding: '0.65rem 1.5rem', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,66,106,0.25)' }
                : { backgroundColor: C.white, color: '#666', padding: '0.65rem 1.5rem', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
              {key === 'council' ? '⚖️  Council Members' : key === 'cohorts' ? '🎓  Cohorts' : key === 'candidates' ? '👤  Ordinands' : key === 'calendar' ? '📆  Calendar' : '📊  Activity'}
            </button>
          ))}
        </div>

        {activeTab === 'council' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8">
              <h2 className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: C.allianceBlue }}>Add Council Member</h2>
              <form onSubmit={handleAddCouncil} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>First Name</label><input className={inputClass} value={newCouncilFirst} onChange={e => setNewCouncilFirst(e.target.value)} placeholder="Jane" required /></div>
                  <div><label className={labelClass}>Last Name</label><input className={inputClass} value={newCouncilLast} onChange={e => setNewCouncilLast(e.target.value)} placeholder="Smith" required /></div>
                </div>
                <div><label className={labelClass}>Email Address</label><input className={inputClass} type="email" value={newCouncilEmail} onChange={e => setNewCouncilEmail(e.target.value)} placeholder="pastor@church.ca" required /></div>
                <div>
                  <label className={labelClass}>Role</label>
                  <select className={inputClass} value={newCouncilRoleMode} onChange={e => setNewCouncilRoleMode(e.target.value as any)}>
                    <option value="council">Council Member only</option>
                    <option value="council_admin">Council Member + Admin access</option>
                    <option value="admin_only">Admin only (no council/grading access)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">Admin access allows managing cohorts, candidates, and council members. Council access enables grading assignments.</p>
                </div>
                <button type="submit" disabled={isAddingCouncil} style={{ backgroundColor: isAddingCouncil ? '#aaa' : C.deepSea, color: C.white, padding: '0.7rem 1.4rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>{isAddingCouncil ? 'Adding...' : 'Add Council Member'}</button>
              </form>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-8 py-5 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Council ({councilMembers.length})</h2>
              </div>
              {councilLoading ? <p className="px-5 sm:px-8 py-12 text-slate-400 text-center font-medium">Loading...</p>
              : councilMembers.length === 0 ? <p className="px-8 py-12 text-slate-400 text-center font-medium">No council members added yet.</p>
              : (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50"><tr>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Email</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Roles</th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {councilMembers.map(m => {
                      const gt: string[] | null = m.grading_types
                      const canGrade = (type: string) => !gt || gt.includes(type)
                      const typeBtn = (type: string, label: string) => (
                        <button
                          key={type}
                          onClick={() => handleToggleGradingType(m, type)}
                          title={`Click to ${canGrade(type) ? 'remove' : 'add'} ${label}`}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${canGrade(type) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`}
                        >{label}</button>
                      )
                      return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 sm:px-8 py-3 sm:py-5">
                          <div className="font-bold text-slate-900">{m.first_name} {m.last_name}</div>
                          <div className="text-sm text-slate-400 font-medium md:hidden">{m.email}</div>
                        </td>
                        <td className="px-4 sm:px-8 py-3 sm:py-5 text-slate-500 font-medium hidden md:table-cell">{m.email}</td>
                        <td className="px-4 sm:px-8 py-3 sm:py-5">
                          <div className="flex flex-wrap gap-1.5 mb-1.5">{(m.roles || []).map((r: string) => (
                            <span key={r} className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_BADGE[r] ?? 'bg-slate-100 text-slate-600'}`}>{r}</span>
                          ))}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {typeBtn('book_report', 'Book Reports')}
                            {typeBtn('paper', 'Papers')}
                            {typeBtn('sermon', 'Sermons')}
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-3 sm:py-5 text-right">
                          <div className="flex items-center justify-end gap-2 sm:gap-4">
                            <Link href={`/dashboard/admin/council/${m.id}`} className="text-blue-500 hover:text-blue-700 font-bold text-sm transition-colors whitespace-nowrap">Manage →</Link>
                            <button onClick={() => handleRemoveCouncil(m)} className="text-red-400 hover:text-red-600 font-bold text-sm transition-colors whitespace-nowrap hidden sm:block">Remove</button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium px-1">Removing a council member strips their council role only. Admin access and grading assignments are preserved until manually changed.</p>
          </div>
        )}

        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8">
              <h2 className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: C.allianceBlue }}>Create New Cohort</h2>
              <form onSubmit={handleAddCohort} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Year</label><input className={inputClass} type="number" value={newCohortYear} onChange={e => { setNewCohortYear(e.target.value); setNewCohortDueDate(autoComputeDueDate(newCohortSeason, e.target.value)) }} required /></div>
                  <div><label className={labelClass}>Season</label>
                    <select className={inputClass} value={newCohortSeason} onChange={e => { setNewCohortSeason(e.target.value as 'spring' | 'fall'); setNewCohortDueDate(autoComputeDueDate(e.target.value, newCohortYear)) }}>
                      <option value="fall">Fall</option><option value="spring">Spring</option>
                    </select>
                  </div>
                </div>
                <div><label className={labelClass}>Cohort Name <span className="normal-case font-medium text-slate-400">(optional — auto-generated if blank)</span></label>
                  <input className={inputClass} value={newCohortName} onChange={e => setNewCohortName(e.target.value)} placeholder={`Fall ${newCohortYear}`} />
                </div>
                <div>
                  <label className={labelClass}>Assignment Due Date <span className="normal-case font-medium text-slate-400">(auto-filled — override if needed)</span></label>
                  <input className={inputClass} type="date" value={newCohortDueDate} onChange={e => setNewCohortDueDate(e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">Spring cohorts default to Feb 28 · Fall cohorts default to Jul 31. Shown to ordinands on their dashboard.</p>
                </div>
                <div>
                  <label className={labelClass}>Sermon Topic</label>
                  <select className={inputClass} value={newCohortSermonTopic} onChange={e => setNewCohortSermonTopic(e.target.value)}>
                    {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">This topic generates 3 sermons. All other topics become papers for every ordinand in this cohort.</p>
                </div>
                <button type="submit" disabled={isAddingCohort} style={{ backgroundColor: isAddingCohort ? '#aaa' : C.deepSea, color: C.white, padding: '0.7rem 1.4rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>{isAddingCohort ? 'Creating...' : 'Create Cohort'}</button>
              </form>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-8 py-5 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">All Cohorts ({cohorts.length})</h2>
              </div>
              {cohortsLoading ? <p className="px-5 sm:px-8 py-12 text-slate-400 text-center font-medium">Loading...</p>
              : cohorts.length === 0 ? <p className="px-8 py-12 text-slate-400 text-center font-medium">No cohorts created yet.</p>
              : (
                <div className="divide-y divide-slate-100">
                  {cohorts.map(c => (
                    <div key={c.id} className="px-5 sm:px-8 py-5 sm:py-6">
                      {editingCohortId === c.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Year</label><input className={inputClass} type="number" value={editCohortYear} onChange={e => setEditCohortYear(e.target.value)} /></div>
                            <div><label className={labelClass}>Season</label>
                              <select className={inputClass} value={editCohortSeason} onChange={e => setEditCohortSeason(e.target.value as 'spring' | 'fall')}>
                                <option value="fall">Fall</option><option value="spring">Spring</option>
                              </select>
                            </div>
                          </div>
                          <div><label className={labelClass}>Cohort Name</label><input className={inputClass} value={editCohortName} onChange={e => setEditCohortName(e.target.value)} /></div>
                          <div><label className={labelClass}>Assignment Due Date</label><input className={inputClass} type="date" value={editCohortDueDate} onChange={e => setEditCohortDueDate(e.target.value)} /></div>
                          <div>
                            <label className={labelClass}>Sermon Topic</label>
                            <select className={inputClass} value={editCohortSermonTopic} onChange={e => setEditCohortSermonTopic(e.target.value)}>
                              {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <p className="text-xs text-amber-600 font-medium mt-1.5">⚠️ Changing the sermon topic does not update requirements already generated for ordinands in this cohort.</p>
                          </div>
                          <div className="flex gap-3 pt-1">
                            <button onClick={handleSaveCohort} disabled={isSavingCohort} style={{ backgroundColor: isSavingCohort ? '#aaa' : C.deepSea, color: C.white, padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>{isSavingCohort ? 'Saving...' : 'Save Changes'}</button>
                            <button onClick={() => setEditingCohortId(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b', backgroundColor: C.white }}>Cancel</button>
                          </div>
                        </div>
                      ) : deletingCohortId === c.id ? (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                          <p className="font-bold text-red-800 mb-1">Delete "{c.name}"?</p>
                          <p className="text-sm text-red-600 mb-4">This cannot be undone. If ordinands are assigned to this cohort, the deletion will fail.</p>
                          <div className="flex gap-3">
                            <button onClick={() => handleDeleteCohort(c.id)} style={{ backgroundColor: '#dc2626', color: C.white, padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Yes, Delete</button>
                            <button onClick={() => setDeletingCohortId(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b', backgroundColor: C.white }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-bold text-slate-900 text-lg">{c.name}</span>
                              {c.assignment_due_date && (
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
                                  Due {new Date(c.assignment_due_date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => startEditCohort(c)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all">✏️ Edit</button>
                              <button onClick={() => setDeletingCohortId(c.id)} className="px-3 py-1.5 text-xs font-bold text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all">🗑 Delete</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                              <p className="text-xs font-black text-purple-500 uppercase tracking-widest mb-2">🎤 Sermon Topic (3 sermons)</p>
                              <p className="font-bold text-purple-900 text-sm">{topicLabel(c.sermon_topic)}</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">📄 Paper Topics (4 papers)</p>
                              <ul className="space-y-1">
                                {TOPICS.filter(t => t.value !== c.sermon_topic).map(t => (
                                  <li key={t.value} className="text-sm text-slate-700 font-medium flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />{t.label}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8">
              <h2 className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: C.allianceBlue }}>Register New Ordinand</h2>
              <p className="text-xs text-slate-400 font-medium mb-5">Adding an ordinand automatically generates their 17 requirements based on their cohort. They will claim this profile when they first log in via Magic Link.</p>
              {cohorts.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-700 text-sm font-medium">
                  You need to create at least one cohort before registering ordinands.{' '}
                  <button onClick={() => setActiveTab('cohorts')} className="font-black underline">Create a cohort →</button>
                </div>
              ) : (
                <form onSubmit={handleAddCandidate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>First Name</label><input className={inputClass} value={newCandidateFirst} onChange={e => setNewCandidateFirst(e.target.value)} placeholder="John" required /></div>
                    <div><label className={labelClass}>Last Name</label><input className={inputClass} value={newCandidateLast} onChange={e => setNewCandidateLast(e.target.value)} placeholder="Doe" required /></div>
                  </div>
                  <div><label className={labelClass}>Email Address</label><input className={inputClass} type="email" value={newCandidateEmail} onChange={e => setNewCandidateEmail(e.target.value)} placeholder="ordinand@church.ca" required /></div>
                  <div>
                    <label className={labelClass}>Assign to Cohort</label>
                    <select className={inputClass} value={newCandidateCohort} onChange={e => setNewCandidateCohort(e.target.value)} required>
                      <option value="">Select a cohort...</option>
                      {cohorts.map(c => <option key={c.id} value={c.id}>{c.name} — Sermons: {topicLabel(c.sermon_topic)}</option>)}
                    </select>
                  </div>
                  <div className="pt-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Mentor <span className="normal-case font-medium text-slate-300">(optional — can be added later)</span></p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className={labelClass}>Mentor Name</label><input className={inputClass} value={newCandidateMentorName} onChange={e => setNewCandidateMentorName(e.target.value)} placeholder="Rev. Jane Smith" /></div>
                      <div><label className={labelClass}>Mentor Email</label><input className={inputClass} type="email" value={newCandidateMentorEmail} onChange={e => setNewCandidateMentorEmail(e.target.value)} placeholder="mentor@church.ca" /></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input type="checkbox" id="autoAssignCheck" checked={autoAssign} onChange={e => setAutoAssign(e.target.checked)} style={{ width: '1rem', height: '1rem', cursor: 'pointer' }} />
                    <label htmlFor="autoAssignCheck" style={{ fontSize: '0.875rem', color: '#64748b', cursor: 'pointer' }}>Auto-assign graders after registration</label>
                  </div>
                  <button type="submit" disabled={isAddingCandidate} style={{ backgroundColor: isAddingCandidate ? '#aaa' : C.deepSea, color: C.white, padding: '0.7rem 1.4rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>{isAddingCandidate ? 'Registering...' : 'Register Ordinand'}</button>
                </form>
              )}
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-8 py-5 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Registered Ordinands ({candidates.length})</h2>
              </div>
              {candidatesLoading ? <p className="px-5 sm:px-8 py-12 text-slate-400 text-center font-medium">Loading...</p>
              : candidates.length === 0 ? <p className="px-8 py-12 text-slate-400 text-center font-medium">No ordinands registered yet.</p>
              : (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50"><tr>
                    <th className="px-4 sm:px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Ordinand</th>
                    <th className="px-4 sm:px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Cohort</th>
                    <th className="px-4 sm:px-8 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.filter(p => !p.status || p.status === 'active').map(person => (
                      <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 sm:px-8 py-4 sm:py-5">
                          <div className="font-bold text-slate-900">{person.first_name} {person.last_name}</div>
                          <div className="text-sm text-slate-400 font-medium">{person.email}</div>
                          <div className="mt-1 sm:hidden">
                            {person.cohorts?.name
                              ? <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{person.cohorts.name}</span>
                              : <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">No cohort</span>}
                          </div>
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 hidden sm:table-cell">
                          {person.cohorts?.name
                            ? <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{person.cohorts.name}</span>
                            : <span className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">No cohort</span>}
                        </td>
                        <td className="px-4 sm:px-8 py-4 sm:py-5 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <Link href={`/dashboard/admin/candidates/${person.id}`} style={{ color: C.allianceBlue }} className="font-black transition-colors text-sm whitespace-nowrap">Manage →</Link>
                            <button
                              onClick={() => { setArchiveTarget(person); setArchiveStep('action'); setArchiveMode(null); setReportComingSoon(false) }}
                              className="text-slate-300 hover:text-red-400 transition-colors text-base font-black leading-none"
                              title="Remove or complete this ordinand"
                            >✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}

              {/* Completed ordinands — archived but records preserved */}
              {candidates.filter(p => p.status === 'completed').length > 0 && (
                <div className="border-t border-slate-100 mt-2">
                  <div className="px-8 py-3 bg-slate-50">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Completed / Archived ({candidates.filter(p => p.status === 'completed').length})</p>
                  </div>
                  <div className="overflow-x-auto opacity-60">
                  <table className="min-w-full divide-y divide-slate-100">
                    <tbody className="divide-y divide-slate-100">
                      {candidates.filter(p => p.status === 'completed').map(person => (
                        <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 sm:px-8 py-4 sm:py-5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-600">{person.first_name} {person.last_name}</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">Completed</span>
                            </div>
                            <div className="text-sm text-slate-400 font-medium">{person.email}</div>
                          </td>
                          <td className="px-4 sm:px-8 py-4 sm:py-5 hidden sm:table-cell">
                            {person.cohorts?.name
                              ? <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{person.cohorts.name}</span>
                              : <span className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">No cohort</span>}
                          </td>
                          <td className="px-4 sm:px-8 py-4 sm:py-5 text-right">
                            <Link href={`/dashboard/admin/candidates/${person.id}`} className="font-black transition-colors text-sm whitespace-nowrap text-slate-400 hover:text-slate-600">View →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>

            {/* Archive / Remove modal */}
            {archiveStep && archiveTarget && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">

                  {archiveStep === 'action' && (
                    <>
                      <h2 className="text-lg font-black text-slate-900 mb-1">Remove {archiveTarget.first_name} {archiveTarget.last_name}?</h2>
                      <p className="text-sm text-slate-500 font-medium mb-6">Choose how you'd like to remove this ordinand from the active roster.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <button
                          onClick={() => setArchiveMode(archiveMode === 'delete' ? null : 'delete')}
                          className={`text-left p-5 rounded-2xl border-2 transition-all ${archiveMode === 'delete' ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-red-200 bg-white'}`}
                        >
                          <div className="text-2xl mb-2">🗑️</div>
                          <div className="font-black text-slate-900 mb-1">Delete</div>
                          <div className="text-xs text-slate-500 font-medium leading-relaxed">Remove this profile from the system entirely. Use for test accounts and fake migration profiles. Records will not be preserved.</div>
                        </button>
                        <button
                          onClick={() => setArchiveMode(archiveMode === 'complete' ? null : 'complete')}
                          className={`text-left p-5 rounded-2xl border-2 transition-all ${archiveMode === 'complete' ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-green-200 bg-white'}`}
                        >
                          <div className="text-2xl mb-2">✅</div>
                          <div className="font-black text-slate-900 mb-1">Mark Complete</div>
                          <div className="text-xs text-slate-500 font-medium leading-relaxed">Remove from the active roster but preserve all submissions, grades, and records for future data analysis.</div>
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { if (archiveMode) setArchiveStep('report') }}
                          disabled={!archiveMode}
                          className="px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all"
                          style={{ backgroundColor: !archiveMode ? '#aaa' : archiveMode === 'delete' ? '#ef4444' : '#16a34a', cursor: !archiveMode ? 'not-allowed' : 'pointer' }}
                        >
                          Continue →
                        </button>
                        <button onClick={() => { setArchiveTarget(null); setArchiveStep(null); setArchiveMode(null) }} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancel</button>
                      </div>
                    </>
                  )}

                  {archiveStep === 'report' && (
                    <>
                      <h2 className="text-lg font-black text-slate-900 mb-1">Generate Archive Report?</h2>
                      <p className="text-sm text-slate-500 font-medium mb-5">
                        Before {archiveMode === 'delete' ? 'deleting' : 'completing'} {archiveTarget.first_name}'s profile, would you like to generate an archive report for your records?
                      </p>
                      <div className="bg-slate-50 rounded-2xl p-5 mb-5 space-y-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Report would include</p>
                        <div className="flex items-start gap-2 text-sm text-slate-700 font-medium"><span className="text-green-500 font-black mt-0.5">✓</span><span>Assignment completion summary (which of 17 were completed)</span></div>
                        <div className="flex items-start gap-2 text-sm text-slate-400 font-medium"><span className="mt-0.5">○</span><span>AI-generated executive summary of all grades &amp; feedback <span className="text-xs bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full ml-1">Coming soon</span></span></div>
                        <div className="flex items-start gap-2 text-sm text-slate-400 font-medium"><span className="mt-0.5">○</span><span>Oral interview report, grade &amp; action items <span className="text-xs bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full ml-1">Coming soon</span></span></div>
                        <div className="flex items-start gap-2 text-sm text-slate-400 font-medium"><span className="mt-0.5">○</span><span>Ordination service date &amp; officiant <span className="text-xs bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full ml-1">Coming soon</span></span></div>
                      </div>

                      {reportComingSoon && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
                          <p className="text-sm font-black text-amber-800 mb-1">🚧 Full report generation is coming soon</p>
                          <p className="text-xs text-amber-700 font-medium">This feature is on the development roadmap. You can review {archiveTarget.first_name}'s current progress on their profile page before proceeding.</p>
                          <Link href={`/dashboard/admin/candidates/${archiveTarget.id}`} className="inline-block mt-2 text-xs font-black text-blue-600 hover:underline">View {archiveTarget.first_name}'s profile →</Link>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setReportComingSoon(true)}
                          className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all"
                          style={{ backgroundColor: C.deepSea }}
                        >📄 Generate Report</button>
                        <button
                          onClick={handleArchiveAction}
                          disabled={isArchiving}
                          className="px-5 py-2.5 rounded-xl font-black text-sm transition-all"
                          style={{ backgroundColor: isArchiving ? '#aaa' : archiveMode === 'delete' ? '#fef2f2' : '#f0fdf4', color: isArchiving ? '#fff' : archiveMode === 'delete' ? '#b91c1c' : '#15803d', cursor: isArchiving ? 'not-allowed' : 'pointer' }}
                        >{isArchiving ? 'Processing…' : `Skip & ${archiveMode === 'delete' ? 'Delete' : 'Complete'}`}</button>
                        <button onClick={() => { setArchiveStep('action'); setReportComingSoon(false) }} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">← Back</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className={`bg-white rounded-3xl border shadow-sm p-5 sm:p-8 ${editingEvent ? 'border-blue-300' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: editingEvent ? C.allianceBlue : C.allianceBlue }}>
                  {editingEvent ? '✏️  Edit Gathering' : 'Add Gathering'}
                </h2>
                {editingEvent && (
                  <button onClick={cancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">✕ Cancel Edit</button>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium mb-5">Events appear on the ordinand's dashboard. The four annual gatherings are: September (online), November (online), February (online), June (in-person).</p>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Cohorts <span className="normal-case font-medium text-slate-400">— select one, multiple, or all</span></label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => { setNewEventAllCohorts(true); setNewEventCohorts([]) }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${newEventAllCohorts ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-300 hover:border-blue-400'}`}
                      >All Cohorts</button>
                      {cohorts.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const isSelected = newEventCohorts.includes(c.id)
                            const next = isSelected ? newEventCohorts.filter(x => x !== c.id) : [...newEventCohorts, c.id]
                            if (next.length === 0) {
                              setNewEventAllCohorts(true)
                              setNewEventCohorts([])
                            } else {
                              setNewEventAllCohorts(false)
                              setNewEventCohorts(next)
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${!newEventAllCohorts && newEventCohorts.includes(c.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-300 hover:border-blue-400'}`}
                        >{c.name}</button>
                      ))}
                    </div>
                    {!newEventAllCohorts && newEventCohorts.length > 1 && (
                      <p className="text-xs text-blue-600 font-bold mt-1.5">{newEventCohorts.length} cohorts selected</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Linked Assignment <span className="normal-case font-medium text-slate-400">(optional)</span></label>
                    <select className={inputClass} value={newEventTemplate} onChange={e => setNewEventTemplate(e.target.value)}>
                      <option value="">No linked assignment</option>
                      <optgroup label="📚 Book Reports">
                        {templates.filter(t => t.type === 'book_report').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </optgroup>
                      <optgroup label="📝 Papers">
                        {templates.filter(t => t.type === 'paper').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </optgroup>
                      <optgroup label="🎤 Sermons">
                        {templates.filter(t => t.type === 'sermon').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </optgroup>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Event Title</label>
                    <input className={inputClass} value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Fall Gathering" required />
                  </div>
                  <div>
                    <label className={labelClass}>Date</label>
                    <input className={inputClass} type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Format</label>
                    <select className={inputClass} value={newEventType} onChange={e => setNewEventType(e.target.value as 'online' | 'in_person')}>
                      <option value="online">Online</option>
                      <option value="in_person">In Person</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Location / Link <span className="normal-case font-medium text-slate-400">(optional)</span></label>
                    <input className={inputClass} value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} placeholder="Zoom link, church address, etc." />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass + ' mb-0'}>Notes <span className="normal-case font-medium text-slate-400">(optional — supports formatting)</span></label>
                    <div className="flex items-center gap-1">
                      <button type="button" title="Bold" onClick={() => insertMd('**', '**', 'bold text')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-600 font-black text-xs transition-colors">B</button>
                      <button type="button" title="Italic" onClick={() => insertMd('*', '*', 'italic text')}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-500 italic text-xs transition-colors">I</button>
                      <button type="button" title="Bullet list" onClick={insertBullet}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-600 text-xs transition-colors font-bold">• List</button>
                      <button type="button" title="Insert link" onClick={insertLink}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-600 text-xs transition-colors">🔗</button>
                    </div>
                  </div>
                  <textarea ref={notesRef} className={inputClass} value={newEventNotes} onChange={e => setNewEventNotes(e.target.value)} rows={4}
                    placeholder={'Any additional details ordinands should know...\n\nUse **bold**, *italic*, [Link Text](https://url), or start lines with - for a bulleted list.'} />
                  <p className="text-xs text-slate-400 mt-1 font-medium">Use **bold**, *italic*, [Link Text](https://url), or start lines with <code className="bg-slate-100 px-1 rounded">-</code> for bullets. Line breaks are preserved.</p>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isAddingEvent} style={{ backgroundColor: isAddingEvent ? '#aaa' : C.deepSea, color: C.white, padding: '0.7rem 1.4rem', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                    {isAddingEvent ? (editingEvent ? 'Saving...' : 'Adding...') : (editingEvent ? 'Save Changes' : 'Add to Calendar')}
                  </button>
                  {editingEvent && (
                    <button type="button" onClick={cancelEdit} style={{ backgroundColor: 'white', color: '#64748b', padding: '0.7rem 1.4rem', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-8 py-5 border-b border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">All Scheduled Events ({events.length})</h2>
              </div>
              {eventsLoading ? <p className="px-8 py-12 text-slate-400 text-center font-medium">Loading...</p>
              : events.length === 0 ? <p className="px-8 py-12 text-slate-400 text-center font-medium">No events scheduled yet.</p>
              : (
                <div className="divide-y divide-slate-100">
                  {events.map(ev => {
                    const d = new Date(ev.event_date + 'T12:00:00')
                    const isPast = d < new Date()
                    const dateStr = d.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    const cohortLabel = !ev.cohort_ids || ev.cohort_ids.length === 0
                      ? 'All Cohorts'
                      : ev.cohort_ids.map((cid: string) => cohorts.find(c => c.id === cid)?.name ?? cid).join(', ')
                    return (
                      <div key={ev.id} className={`px-4 sm:px-8 py-4 sm:py-5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 sm:gap-4 ${isPast ? 'opacity-50' : ''}`}>
                        <div className="flex items-start gap-4">
                          <div className="text-center bg-slate-100 rounded-xl px-3 py-2 min-w-[52px] flex-shrink-0">
                            <p className="text-xs font-black text-slate-500 uppercase">{d.toLocaleDateString('en-CA', { month: 'short' })}</p>
                            <p className="text-xl font-black text-slate-800 leading-none">{d.getDate()}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{ev.title}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ev.event_type === 'in_person' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {ev.event_type === 'in_person' ? '📍 In Person' : '💻 Online'}
                              </span>
                              {isPast && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400">Past</span>}
                            </div>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">{dateStr}</p>
                            <p className="text-xs text-blue-600 font-bold mt-1">📅 {cohortLabel}</p>
                            {ev.requirement_templates && <p className="text-xs text-purple-600 font-bold mt-0.5">📋 {ev.requirement_templates.title}</p>}
                            {ev.location && <p className="text-xs text-slate-400 font-medium mt-0.5 line-clamp-1 break-all">📍 {ev.location}</p>}
                            {ev.notes && <p className="text-xs text-slate-400 font-medium mt-0.5 italic line-clamp-2 break-all">{ev.notes.replace(/<[^>]*>/g, '')}</p>}
                          </div>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                          <button onClick={() => startEditEvent(ev)} className="text-blue-400 hover:text-blue-600 font-bold text-sm transition-colors whitespace-nowrap">Edit</button>
                          <button onClick={() => handleDeleteEvent(ev.id, ev.title)} className="text-red-400 hover:text-red-600 font-bold text-sm transition-colors whitespace-nowrap">Remove</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: C.allianceBlue }}>User Activity Log</h2>
              <button onClick={fetchActivity} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors" style={{ color: C.allianceBlue }}>
                ↻ Refresh
              </button>
            </div>

            {activityLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 font-medium text-sm">Loading activity…</div>
            ) : activityLogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 font-medium text-sm">No activity recorded yet.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">User</th>
                      <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Event</th>
                      <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Details</th>
                      <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log, i) => {
                      const prof = log.profiles
                      const name = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Unknown'
                      const roles: string[] = prof?.roles || []
                      const roleLabel = roles.includes('admin') ? 'Admin' : roles.includes('council') ? 'Council' : 'Ordinand'
                      const roleColor = roles.includes('admin') ? 'bg-blue-100 text-blue-700' : roles.includes('council') ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                      const eventLabels: Record<string, string> = {
                        login:              '🔐 Login',
                        ordinand_dashboard: '🏠 Dashboard',
                        requirement_view:   '📄 Viewed Requirement',
                        submission:         '📤 Submitted',
                        study_agent:        '🤖 Study Agent',
                        council_dashboard:  '⚖️ Council Dashboard',
                        grading_view:       '👁 Viewed Submission',
                        grade_submitted:    '✅ Grade Submitted',
                        process_guide:      '📖 Process Guide',
                        profile_view:       '👤 Profile',
                      }
                      const eventLabel = eventLabels[log.event_type] || log.event_type
                      const details = log.metadata?.title || log.metadata?.rating
                        ? [log.metadata?.title, log.metadata?.rating ? `→ ${log.metadata.rating}` : '', log.metadata?.ordinand ? `for ${log.metadata.ordinand}` : ''].filter(Boolean).join(' ')
                        : ''
                      const when = new Date(log.created_at)
                      const isToday = new Date().toDateString() === when.toDateString()
                      const timeStr = isToday
                        ? when.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
                        : when.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      return (
                        <tr key={log.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{name}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleColor}`}>{roleLabel}</span>
                            </div>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">{prof?.email}</div>
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-700">{eventLabel}</td>
                          <td className="px-5 py-3 text-slate-500 hidden md:table-cell max-w-xs truncate">{details}</td>
                          <td className="px-5 py-3 text-right text-xs font-medium text-slate-400 whitespace-nowrap">{timeStr}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
                  Showing most recent {activityLogs.length} events
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {showViewAs && (
        <ViewAsUserModal
          onClose={() => setShowViewAs(false)}
          ordinands={candidates}
          councilMembers={councilMembers}
        />
      )}

    </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageContent />
    </Suspense>
  )
}
