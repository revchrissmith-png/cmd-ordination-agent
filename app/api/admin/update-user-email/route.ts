// app/api/admin/update-user-email/route.ts
// Updates a user's email in both auth.users (service role) and profiles.
// Admin-only. PATCH { userId, email }
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest) {
  // Verify caller is an authenticated admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await serviceClient
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()
  if (!callerProfile?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, email } = await req.json()
  if (!userId || !email) return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 })
  }

  // Update auth.users
  const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(userId, { email })
  if (authUpdateError) {
    console.error('update-user-email auth error:', authUpdateError)
    return NextResponse.json({ error: 'Failed to update authentication email' }, { status: 500 })
  }

  // Mirror to profiles table
  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({ email })
    .eq('id', userId)
  if (profileError) {
    console.error('update-user-email profile error:', profileError)
    return NextResponse.json({ error: 'Auth email updated but profile sync failed. Contact support.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
