// app/api/council/interview-scores/route.ts
// Council members submit (upsert) their scores and retrieve their own scores.
// GET: fetch own scores for an interview
// POST: upsert scores (insert or update, lock on submit)

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'
import { INTERVIEW_SECTIONS, INTERVIEW_RATINGS, type InterviewRating } from '../../../../utils/interviewQuestions'

const VALID_SECTION_IDS = new Set(INTERVIEW_SECTIONS.map(s => s.id))
const VALID_RATINGS = new Set<string>(INTERVIEW_RATINGS)

/** GET /api/council/interview-scores?interviewId=<uuid> */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'council')
  if (auth.error) return auth.error

  const interviewId = req.nextUrl.searchParams.get('interviewId')
  if (!interviewId || !isValidUUID(interviewId)) {
    return NextResponse.json({ error: 'Valid interviewId required' }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('interview_scores')
    .select('*')
    .eq('interview_id', interviewId)
    .eq('council_member_id', auth.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }

  return NextResponse.json({ scores: data })
}

/** POST /api/council/interview-scores — upsert scores */
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'council')
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const { interviewId, scores, submit } = body

  if (!interviewId || !isValidUUID(interviewId)) {
    return NextResponse.json({ error: 'Valid interviewId required' }, { status: 400 })
  }

  // Validate scores object
  if (!scores || typeof scores !== 'object') {
    return NextResponse.json({ error: 'scores object required' }, { status: 400 })
  }
  for (const [key, val] of Object.entries(scores)) {
    if (!VALID_SECTION_IDS.has(key)) {
      return NextResponse.json({ error: `Invalid section: ${key}` }, { status: 400 })
    }
    if (val && !VALID_RATINGS.has(val as string)) {
      return NextResponse.json({ error: `Invalid rating for ${key}: ${val}` }, { status: 400 })
    }
  }

  // Check if already submitted (locked)
  const { data: existing } = await serviceClient
    .from('interview_scores')
    .select('id, submitted_at')
    .eq('interview_id', interviewId)
    .eq('council_member_id', auth.user.id)
    .maybeSingle()

  if (existing?.submitted_at) {
    return NextResponse.json({ error: 'Scores already submitted and locked' }, { status: 409 })
  }

  const upsertData: any = {
    interview_id: interviewId,
    council_member_id: auth.user.id,
    scores,
  }
  if (submit) {
    upsertData.submitted_at = new Date().toISOString()
  }

  const { data, error } = await serviceClient
    .from('interview_scores')
    .upsert(upsertData, { onConflict: 'interview_id,council_member_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 })
  }

  return NextResponse.json({ scores: data })
}
