// app/api/admin/interview-brief/route.ts
// Generates an AI-powered interview brief for a pastoral candidate.
// Admin-only. Streams the response so the UI updates as the brief is written.

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are preparing a confidential AI Interview Brief for the Canadian Midwest District (CMD) ordination council of The Christian and Missionary Alliance. This brief will help council members conduct a meaningful, personalized oral interview with a pastoral candidate (called an "ordinand").

Your role is to be a thoughtful synthesizer — not a judge. The council has already read the assignments. Your job is to help them see patterns, notice growth, and identify the most fruitful areas for conversation.

Write in a warm, professional tone appropriate for a church context. Be specific and evidence-based — reference actual assignment titles, quote phrases from feedback, and cite concrete examples. Avoid vague generalizations. If data is absent or incomplete, note it briefly rather than speculating.

The rating scale used throughout is: Insufficient → Adequate → Good → Excellent → Exceptional.

Format your response using this exact structure, with the section headers as shown:

CANDIDATE OVERVIEW
A brief paragraph situating the candidate — their name, cohort, mentor, how far along they are in the process, and any notable context.

ASSIGNMENT COMPLETION SUMMARY
A clear picture of their 17-requirement completion. Group by type (book reports, papers, sermons). Note overall trajectory and any revisions requested.

COUNCIL-IDENTIFIED STRENGTHS
2–4 genuine strengths drawn directly from grader feedback and ratings. Quote specific phrases where possible. These should reflect patterns across multiple assessments, not just one strong mark.

AREAS FOR CONTINUED GROWTH
2–3 growth areas framed as conversation starters, not criticism. Diplomatically worded. Reference specific feedback. Frame these as things the council may want to explore, not weaknesses to interrogate.

SELF-ASSESSMENT INSIGHT
For each paper where self-assessment data exists: note where the ordinand's self-perception aligned with or diverged from the council's assessment. Significant gaps (2+ levels on the scale) deserve specific mention. Frame this as insight into self-awareness and reflective capacity — not as a gotcha.

PARDINGTON STUDY PATTERNS
What topics did this ordinand wrestle with in their AI study sessions with Pardington? What did they return to repeatedly? What questions suggest genuine theological wrestling vs. surface-level curiosity? What does this suggest about their growth edge or deepest interests? If no sessions are recorded, note this and suggest the council may wish to ask how they approached independent theological study.

SUGGESTED INTERVIEW PROBES
5–6 specific questions tailored to this candidate, drawn from the evidence above. These should open conversation, not corner the candidate. Mix affirmation-based questions ("We noticed real strength in X — tell us about your journey there") with growth-oriented ones. Make each question feel personal, not generic.`

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RATING_LABELS: Record<string, string> = {
  insufficient: 'Insufficient',
  adequate:     'Adequate',
  good:         'Good',
  excellent:    'Excellent',
  exceptional:  'Exceptional',
}

const RATING_ORDER = ['insufficient', 'adequate', 'good', 'excellent', 'exceptional']

const PAPER_SECTION_LABELS: Record<string, string> = {
  completeness:       'Completeness & Breadth',
  theological_depth:  'Theological Depth',
  scripture:          'Scripture Use',
  personal_reflection:'Personal Reflection',
  sources:            'Sources & Research',
  grammar:            'Writing Quality',
}

function ratingGap(selfRating: string, councilRating: string): string {
  const s = RATING_ORDER.indexOf(selfRating)
  const c = RATING_ORDER.indexOf(councilRating)
  if (s === -1 || c === -1) return ''
  const diff = s - c
  if (diff >= 2)  return ' ← SIGNIFICANTLY overrated self'
  if (diff === 1) return ' ← slightly overrated self'
  if (diff === 0) return ' ← aligned'
  if (diff === -1) return ' ← slightly underrated self'
  return ' ← SIGNIFICANTLY underrated self'
}

function getSubmission(req: any) {
  return Array.isArray(req.submissions) ? req.submissions[0] : req.submissions
}

function getGrade(req: any) {
  const sub = getSubmission(req)
  return Array.isArray(sub?.grades) ? sub?.grades[0] : sub?.grades
}

// ─── Context builder ──────────────────────────────────────────────────────────

function buildContext(
  candidate: any,
  cohort: any,
  requirements: any[] | null,
  pardingtonLogs: any[] | null,
  evalTokens: any[] | null,
  evaluations: any[] | null,
  councilMembers: any[] | null,
): string {
  const lines: string[] = []

  // ── Candidate profile ──
  lines.push(`=== CANDIDATE DATA FOR AI INTERVIEW BRIEF ===`, ``)
  lines.push(`Name: ${candidate?.first_name ?? ''} ${candidate?.last_name ?? ''}`)
  lines.push(`Email: ${candidate?.email ?? ''}`)
  if (cohort) {
    const topic = cohort.sermon_topic?.replace(/_/g, ' ') ?? 'unknown'
    lines.push(`Cohort: ${cohort.year} ${cohort.season} — Sermon topic: ${topic}`)
  }
  if (candidate?.mentor_name)  lines.push(`Mentor: ${candidate.mentor_name}`)
  if (candidate?.mentor_email) lines.push(`Mentor email: ${candidate.mentor_email}`)
  if (candidate?.created_at) {
    const since = new Date(candidate.created_at).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
    lines.push(`Portal record created: ${since}`)
  }
  lines.push(``)

  // ── Requirements ──
  if (requirements && requirements.length > 0) {
    const byType = (type: string) => requirements.filter(r => r.requirement_templates?.type === type)
    const statusLabel: Record<string, string> = {
      complete:          'COMPLETE',
      revision_required: 'REVISION REQUIRED',
      submitted:         'SUBMITTED (awaiting grade)',
      under_review:      'UNDER REVIEW',
      not_started:       'NOT STARTED',
    }

    const printGroup = (label: string, reqs: any[]) => {
      lines.push(`${label}:`)
      const sorted = reqs.sort((a, b) =>
        (a.requirement_templates?.display_order ?? 0) - (b.requirement_templates?.display_order ?? 0)
      )
      for (const req of sorted) {
        const tmpl  = req.requirement_templates
        const grade = getGrade(req)
        const graderRecord = councilMembers?.find(m => m.id === (Array.isArray(req.grading_assignments) ? req.grading_assignments[0]?.council_member_id : req.grading_assignments?.council_member_id))
        const graderName = graderRecord ? `${graderRecord.first_name} ${graderRecord.last_name}` : null
        let line = `  • ${tmpl?.title ?? 'Unknown'} — ${statusLabel[req.status] ?? req.status}`
        if (grade?.overall_rating) line += ` — Rating: ${RATING_LABELS[grade.overall_rating] ?? grade.overall_rating}`
        if (graderName) line += ` — Grader: ${graderName}`
        lines.push(line)
      }
      lines.push(``)
    }

    lines.push(`--- REQUIREMENTS (17 total) ---`, ``)
    printGroup('BOOK REPORTS (10)', byType('book_report'))
    printGroup('THEOLOGICAL PAPERS (4)', byType('paper'))
    printGroup('SERMONS (3)', byType('sermon'))
  }

  // ── Council feedback ──
  const gradedReqs = (requirements ?? []).filter(r => !!getGrade(r)?.overall_rating)
  lines.push(`--- COUNCIL FEEDBACK ---`, ``)
  if (gradedReqs.length === 0) {
    lines.push(`(No graded items yet)`, ``)
  } else {
    for (const req of gradedReqs) {
      const tmpl  = req.requirement_templates
      const grade = getGrade(req)
      if (!grade) continue
      const graderRecord = councilMembers?.find(m => m.id === grade.graded_by)
      const graderName = graderRecord ? `${graderRecord.first_name} ${graderRecord.last_name}` : (grade.graded_by ? 'Council member' : 'Unknown')
      const dateStr = grade.graded_at
        ? new Date(grade.graded_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
        : ''
      lines.push(`${tmpl?.title ?? 'Unknown'} (${(tmpl?.type ?? '').replace('_', ' ')})`)
      lines.push(`Rating: ${RATING_LABELS[grade.overall_rating] ?? grade.overall_rating} | Grader: ${graderName}${dateStr ? ` | ${dateStr}` : ''}`)
      if (grade.overall_comments) lines.push(`Feedback: "${grade.overall_comments}"`)

      // Paper section ratings from council
      if (grade.paper_assessment?.section_ratings) {
        lines.push(`Council section ratings:`)
        for (const [sid, sr] of Object.entries(grade.paper_assessment.section_ratings)) {
          lines.push(`  ${PAPER_SECTION_LABELS[sid] ?? sid}: ${RATING_LABELS[sr as string] ?? sr}`)
        }
      }

      // Sermon section comments
      if (grade.sermon_section_comments) {
        const sectionLabels: Record<string, string> = {
          intro: 'Introduction', scripture_use: 'Scripture Use', theology: 'Theology',
          application: 'Application', delivery: 'Delivery', conclusion: 'Conclusion',
        }
        for (const [key, comment] of Object.entries(grade.sermon_section_comments)) {
          if (comment) lines.push(`  ${sectionLabels[key] ?? key}: "${comment}"`)
        }
      }
      lines.push(``)
    }
  }

  // ── Self-assessment (papers only) ──
  const paperReqs = (requirements ?? []).filter(r => r.requirement_templates?.type === 'paper')
  const papersWithSA = paperReqs.filter(r => getSubmission(r)?.self_assessment?.version === 2)

  if (papersWithSA.length > 0) {
    lines.push(`--- SELF-ASSESSMENT vs COUNCIL GRADE (papers) ---`, ``)
    for (const req of papersWithSA) {
      const tmpl   = req.requirement_templates
      const sub    = getSubmission(req)
      const grade  = getGrade(req)
      const sa     = sub?.self_assessment?.sections
      if (!sa) continue

      lines.push(`Paper: ${tmpl?.title ?? 'Unknown'}`)
      const councilSections = grade?.paper_assessment?.section_ratings ?? {}

      for (const [sid, sectionLabel] of Object.entries(PAPER_SECTION_LABELS)) {
        const sectionData = sa[sid]
        if (!sectionData) continue

        // Completeness has per-question ratings; others have a single rating
        let selfRating: string | undefined
        if (sid === 'completeness') {
          const qRatings = Object.values(sectionData.question_ratings ?? {}) as string[]
          if (qRatings.length > 0) {
            // Use the lowest rating as the representative value (conservative)
            selfRating = qRatings.sort((a, b) => RATING_ORDER.indexOf(a) - RATING_ORDER.indexOf(b))[0]
            lines.push(`  ${sectionLabel}: self → ${qRatings.map(r => RATING_LABELS[r] ?? r).join(', ')} (individual questions)`)
          }
        } else {
          selfRating = sectionData.rating
          const councilRating = councilSections[sid]
          let line = `  ${sectionLabel}: self → ${RATING_LABELS[selfRating ?? ''] ?? selfRating ?? 'not rated'}`
          if (councilRating) {
            line += ` | council → ${RATING_LABELS[councilRating] ?? councilRating}`
            if (selfRating) line += ratingGap(selfRating, councilRating)
          }
          lines.push(line)
        }

        const evidence = sectionData.evidence
        if (evidence) {
          const excerpt = evidence.length > 350 ? evidence.slice(0, 347) + '…' : evidence
          lines.push(`    Evidence: "${excerpt}"`)
        }
      }
      lines.push(``)
    }
  } else if (paperReqs.length > 0) {
    lines.push(`--- SELF-ASSESSMENT (papers) ---`, ``)
    lines.push(`(No self-assessment data recorded for any papers yet)`, ``)
  }

  // ── Pardington logs ──
  lines.push(`--- PARDINGTON STUDY SESSIONS ---`, ``)
  if (!pardingtonLogs || pardingtonLogs.length === 0) {
    lines.push(`(No Pardington study sessions recorded)`, ``)
  } else {
    lines.push(`Total sessions: ${pardingtonLogs.length}`)
    let charCount = 0
    const MAX_CHARS = 4000
    for (const log of pardingtonLogs) {
      if (charCount >= MAX_CHARS) { lines.push(`[remaining sessions omitted — cap reached]`); break }
      const date = new Date(log.started_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
      const userMessages = ((log.messages ?? []) as any[]).filter((m: any) => m.role === 'user')
      if (userMessages.length === 0) continue
      lines.push(`Session — ${date} (${userMessages.length} ordinand messages):`)
      for (const msg of userMessages) {
        if (charCount >= MAX_CHARS) break
        const excerpt = msg.content.length > 280 ? msg.content.slice(0, 277) + '…' : msg.content
        lines.push(`  - "${excerpt}"`)
        charCount += excerpt.length + 5
      }
      lines.push(``)
    }
  }

  // ── External evaluations ──
  if (evaluations && evaluations.length > 0) {
    lines.push(`--- EXTERNAL EVALUATIONS ---`, ``)
    for (const ev of evaluations) {
      const tok = evalTokens?.find(t => t.id === ev.token_id)
      const typeLabel = tok?.eval_type === 'mentor' ? 'MENTOR EVALUATION' : 'CHURCH BOARD EVALUATION'
      const submitted = tok?.submitted_at
        ? new Date(tok.submitted_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
        : ''
      lines.push(`${typeLabel} — ${ev.evaluator_name}${submitted ? ` — submitted ${submitted}` : ''}`)
      if (tok?.eval_type === 'church') {
        if (ev.ministry_start_date)   lines.push(`Ministry commenced: ${ev.ministry_start_date}`)
        if (ev.board_member_position) lines.push(`Board position: ${ev.board_member_position}`)
      }
      if (ev.q1_call)              lines.push(`Sense of calling: "${ev.q1_call}"`)
      if (ev.q2_strengths)         lines.push(`Strengths: "${ev.q2_strengths}"`)
      if (ev.q3_development)       lines.push(`Areas for development: "${ev.q3_development}"`)
      if (ev.q4_ratings) {
        lines.push(`Category ratings:`)
        for (const [cat, rating] of Object.entries(ev.q4_ratings)) {
          lines.push(`  ${cat}: ${RATING_LABELS[rating as string] ?? rating}`)
        }
      }
      if (ev.q5a_spiritual_growth)    lines.push(`Spiritual growth: "${ev.q5a_spiritual_growth}"`)
      if (ev.q5b_emotional_stability) lines.push(`Emotional stability: "${ev.q5b_emotional_stability}"`)
      if (ev.q5c_family_relationship) lines.push(`Family relationship: "${ev.q5c_family_relationship}"`)
      if (ev.q6_moral_concern)        lines.push(`Moral concerns: "${ev.q6_moral_concern}"`)
      if (ev.q7_fruitfulness)         lines.push(`Ministry fruitfulness: "${ev.q7_fruitfulness}"`)
      if (ev.q8_recommendation !== null && ev.q8_recommendation !== undefined) {
        lines.push(`Recommends for ordination: ${ev.q8_recommendation ? 'YES' : 'NO'}`)
        if (ev.q8_explanation) lines.push(`Explanation: "${ev.q8_explanation}"`)
      }
      if (ev.additional_comments)   lines.push(`Additional comments: "${ev.additional_comments}"`)
      lines.push(``)
    }
  } else {
    lines.push(`--- EXTERNAL EVALUATIONS ---`, ``)
    lines.push(`(No evaluations submitted yet)`, ``)
  }

  return lines.join('\n')
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return new Response('Unauthorized', { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()
  if (!adminProfile?.roles?.includes('admin')) return new Response('Forbidden', { status: 403 })

  const { ordinandId } = await req.json()
  if (!ordinandId) return new Response('Missing ordinandId', { status: 400 })

  // Fetch all data in parallel
  const [
    { data: candidate },
    { data: requirements },
    { data: pardingtonLogs },
    { data: evalTokens },
    { data: councilMembers },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email, mentor_name, mentor_email, cohort_id, created_at')
      .eq('id', ordinandId)
      .single(),
    supabaseAdmin
      .from('ordinand_requirements')
      .select(`
        id, status,
        requirement_templates(type, topic, book_category, title, display_order),
        grading_assignments(id, council_member_id),
        submissions(id, file_name, self_assessment, submitted_at,
          grades(overall_rating, overall_comments, graded_by, graded_at, paper_assessment, sermon_section_comments)
        )
      `)
      .eq('ordinand_id', ordinandId),
    supabaseAdmin
      .from('pardington_logs')
      .select('messages, started_at, message_count')
      .eq('ordinand_id', ordinandId)
      .order('started_at', { ascending: true }),
    supabaseAdmin
      .from('evaluation_tokens')
      .select('id, eval_type, evaluator_name, evaluator_email, status, submitted_at')
      .eq('ordinand_id', ordinandId),
    supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .contains('roles', ['council']),
  ])

  // Fetch cohort if candidate has one
  let cohort: { name: any; year: any; season: any; sermon_topic: any } | null = null
  if (candidate?.cohort_id) {
    const { data } = await supabaseAdmin
      .from('cohorts')
      .select('name, year, season, sermon_topic')
      .eq('id', candidate.cohort_id)
      .single()
    cohort = data
  }

  // Fetch submitted evaluations
  const submittedTokenIds = (evalTokens ?? []).filter(t => t.status === 'submitted').map(t => t.id)
  let evaluations: any[] = []
  if (submittedTokenIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('evaluations')
      .select('*')
      .in('token_id', submittedTokenIds)
    evaluations = data ?? []
  }

  const context = buildContext(candidate, cohort, requirements, pardingtonLogs, evalTokens, evaluations, councilMembers)

  // Stream the brief
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: 'user', content: context }],
        })
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':          'text/plain',
      'Cache-Control':         'no-cache',
      'X-Content-Type-Options':'nosniff',
    },
  })
}
