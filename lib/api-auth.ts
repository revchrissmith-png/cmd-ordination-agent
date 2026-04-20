// lib/api-auth.ts
// Shared authentication & authorization helpers for API routes.
// Eliminates the duplicated auth-check boilerplate across routes.
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type AuthResult = { user: any; roles: string[]; error?: undefined }
                | { user?: undefined; roles?: undefined; error: NextResponse }

/**
 * Verify the caller has a valid Supabase session.
 * Returns the user object and their roles, or an error response.
 */
export async function authenticateUser(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const token = authHeader.slice(7)
  const { data: { user }, error } = await serviceClient.auth.getUser(token)
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  return { user, roles: profile?.roles ?? [] }
}

/**
 * Verify the caller has at least one of the specified roles.
 * Admin always passes. Returns error response if forbidden.
 */
export async function requireRole(req: NextRequest, ...allowedRoles: string[]): Promise<AuthResult> {
  const result = await authenticateUser(req)
  if (result.error) return result

  const has = result.roles.some(r => allowedRoles.includes(r)) || result.roles.includes('admin')
  if (!has) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return result
}

/** UUID v4 format check */
export function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
