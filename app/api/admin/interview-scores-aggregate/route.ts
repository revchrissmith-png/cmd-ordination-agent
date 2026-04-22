// app/api/admin/interview-scores-aggregate/route.ts
// Returns anonymous aggregate scores for an interview — used by the chair's debrief view.
// Admin-only. No names attached to individual scores.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, serviceClient, isValidUUID } from '../../../../lib/api-auth'
import {
  INTERVIEW_SECTIONS,
  INTERVIEW_RATING_VALUE,
  averageToRating,
  type InterviewRating,
} from '../../../../utils/interviewQuestions'

/** GET /api/admin/interview-scores-aggregate?interviewId=<uuid> */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth.error) return auth.error

  const interviewId = req.nextUrl.searchParams.get('interviewId')
  if (!interviewId || !isValidUUID(interviewId)) {
    return NextResponse.json({ error: 'Valid interviewId required' }, { status: 400 })
  }

  // Fetch all submitted scores for this interview (no names)
  const { data: allScores, error } = await serviceClient
    .from('interview_scores')
    .select('scores, submitted_at')
    .eq('interview_id', interviewId)
    .not('submitted_at', 'is', null)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }

  const submittedCount = allScores?.length ?? 0

  // Build per-section aggregation
  const sectionAggregates: Record<string, {
    sectionId: string
    title: string
    ratings: string[]       // anonymous list of individual ratings
    values: number[]        // numeric equivalents
    average: number | null
    averageRating: string | null
  }> = {}

  for (const section of INTERVIEW_SECTIONS) {
    const ratings: string[] = []
    const values: number[] = []

    for (const scoreRow of (allScores ?? [])) {
      const rating = scoreRow.scores?.[section.id]
      if (rating && INTERVIEW_RATING_VALUE[rating as InterviewRating] !== undefined) {
        ratings.push(rating)
        values.push(INTERVIEW_RATING_VALUE[rating as InterviewRating])
      }
    }

    const average = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null

    sectionAggregates[section.id] = {
      sectionId: section.id,
      title: section.title,
      ratings,
      values,
      average,
      averageRating: average !== null ? averageToRating(average) : null,
    }
  }

  // Overall average across all sections
  const allValues = Object.values(sectionAggregates)
    .map(s => s.average)
    .filter((v): v is number => v !== null)
  const overallAverage = allValues.length > 0
    ? allValues.reduce((a, b) => a + b, 0) / allValues.length
    : null

  return NextResponse.json({
    interviewId,
    submittedCount,
    sections: sectionAggregates,
    overallAverage,
    overallRating: overallAverage !== null ? averageToRating(overallAverage) : null,
  })
}
