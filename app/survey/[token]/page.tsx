// app/survey/[token]/page.tsx
// Token-gated survey response form (no login required).
//
// The token in the URL identifies a cohort_event_survey_invitations row.
// Server-side data fetch keeps the token off the client unless it's needed
// (it's already in the URL anyway). All writes go through POST /api/survey/[token].
import { notFound } from 'next/navigation'
import { serviceClient } from '../../../lib/api-auth'
import SurveyForm from './_components/SurveyForm'
import type { Question } from '../../../lib/surveys/types'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

export default async function SurveyTokenPage({ params }: Props) {
  const { token } = await params

  const { data: invitation } = await serviceClient
    .from('cohort_event_survey_invitations')
    .select(`
      id, token, submitted_at,
      profile:profiles ( id, full_name, first_name ),
      survey:cohort_event_surveys ( id, title, intro, questions, closes_at, sent_at )
    `)
    .eq('token', token)
    .single()

  if (!invitation) {
    notFound()
  }
  const survey  = (invitation as any).survey
  const profile = (invitation as any).profile

  // Mark opened_at on first view (fire-and-forget)
  void serviceClient
    .from('cohort_event_survey_invitations')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', (invitation as any).id)
    .is('opened_at', null)

  if (invitation.submitted_at) {
    return (
      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Already submitted</h1>
          <p className="text-slate-600">
            Thanks — your response was recorded. The OC and district team will read every one.
          </p>
        </div>
      </main>
    )
  }

  if (survey?.closes_at && new Date(survey.closes_at).getTime() < Date.now()) {
    return (
      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Survey closed</h1>
          <p className="text-slate-600">This survey is no longer accepting responses.</p>
        </div>
      </main>
    )
  }

  const questions: Question[] = Array.isArray(survey?.questions) ? survey.questions : []
  const firstName = profile?.first_name ?? profile?.full_name?.split(' ')[0] ?? null

  return (
    <SurveyForm
      token={token}
      title={survey.title}
      intro={survey.intro ?? ''}
      questions={questions}
      firstName={firstName}
    />
  )
}
