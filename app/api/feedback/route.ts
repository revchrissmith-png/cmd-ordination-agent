// app/api/feedback/route.ts
// Saves a bug report or feature request from any authenticated portal user.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ success: false }, { status: 401 })

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const body = await req.json().catch(() => ({}))
  const { type, title, description, pageUrl } = body

  const validTypes = ['bug', 'feature', 'question', 'other']
  if (!type || !validTypes.includes(type) || !title?.trim() || !description?.trim()) {
    return NextResponse.json({ success: false, reason: 'Missing or invalid required fields' }, { status: 400 })
  }

  const { error: insertError } = await serviceClient
    .from('feedback_reports')
    .insert({
      user_id:     user.id,
      user_email:  (profile as any)?.email ?? user.email ?? null,
      user_name:   (profile as any)?.full_name ?? null,
      type,
      title:       title.trim(),
      description: description.trim(),
      page_url:    pageUrl ?? null,
    })

  if (insertError) {
    console.error('feedback insert error:', insertError)
    return NextResponse.json({ success: false }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
