// app/api/admin/register-user/route.ts
// Server-side route that uses the service role key to create auth users
// and their profiles. Must be called with the admin's session token.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // 1. Verify the caller is an admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user: caller } } = await serviceClient.auth.getUser(token)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await serviceClient
    .from('profiles')
    .select('roles')
    .eq('id', caller.id)
    .single()

  if (!callerProfile?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  // 2. Parse request body
  const { email, firstName, lastName, cohortId, mentorName, mentorEmail, roles } = await req.json()
  if (!email || !firstName || !lastName || !roles?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 3. Create the auth user (this gives us the real UUID)
  const { data: { user }, error: authError } = await serviceClient.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    email_confirm: true,
    user_metadata: { first_name: firstName.trim(), last_name: lastName.trim() },
  })

  if (authError || !user) {
    const msg = authError?.message?.includes('already been registered')
      ? 'A user with this email already exists'
      : 'Failed to create user account'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 4. Update the profile the trigger auto-created with our complete data
  // (the on_auth_user_created trigger inserts a partial row the moment createUser fires,
  // so we upsert to fill in full_name, roles array, and cohort_id)
  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: user.id,
    email: email.toLowerCase().trim(),
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    full_name: `${firstName.trim()} ${lastName.trim()}`,
    roles,
    cohort_id: cohortId ?? null,
    mentor_name: mentorName ?? null,
    mentor_email: mentorEmail ?? null,
  }, { onConflict: 'id' })

  if (profileError) {
    // Roll back: delete the auth user so we don't leave orphaned accounts
    await serviceClient.auth.admin.deleteUser(user.id)
    console.error('register-user profile upsert error:', profileError)
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 400 })
  }

  // 5. If this is an ordinand with a cohort, auto-generate their 17 requirements
  if (roles.includes('ordinand') && cohortId) {
    const { data: cohort } = await serviceClient
      .from('cohorts')
      .select('sermon_topic')
      .eq('id', cohortId)
      .single()

    const { data: templates } = await serviceClient
      .from('requirement_templates')
      .select('id, type, topic, title')

    if (cohort && templates) {
      const assigned = templates.filter(t => {
        if (t.type === 'book_report') return true
        if (t.type === 'paper') return t.topic !== cohort.sermon_topic
        if (t.type === 'sermon') return t.topic === cohort.sermon_topic && t.title !== 'Sermon: Scripture (placeholder)'
        return false
      })

      const rows = assigned.map(t => ({
        ordinand_id: user.id,
        template_id: t.id,
        cohort_id: cohortId,
        status: 'not_started',
      }))

      const { error: reqError } = await serviceClient.from('ordinand_requirements').insert(rows)
      if (reqError) {
        return NextResponse.json({
          success: true,
          userId: user.id,
          warning: 'Profile created but requirements could not be generated. Contact support.',
        })
      }

      return NextResponse.json({ success: true, userId: user.id, requirementsCreated: rows.length })
    }
  }

  return NextResponse.json({ success: true, userId: user.id })
}
