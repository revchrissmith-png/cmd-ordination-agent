// middleware.ts
// Session-refresh middleware using @supabase/ssr.
// Runs at the Edge before every page render and keeps the auth cookie
// fresh so server components (and future SSR pages) always have a valid token.
//
// NOTE: Route-level auth protection (redirecting unauthenticated users to login)
// is handled client-side in each page component. The middleware intentionally does
// NOT redirect here because of a timing race: immediately after OTP verification the
// session cookie may not yet be readable by the Edge runtime, which causes an
// infinite redirect loop (middleware bounces to /, login page tries /dashboard again).
// Revisit once the cookie timing is confirmed stable across deployments.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Build a mutable response so the Supabase client can write refreshed cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session token if it is close to expiry.
  // We call getUser() (not getSession()) because getUser() performs a
  // server-side token validation and triggers a token refresh when needed.
  // We intentionally ignore the return value here — no redirect on failure.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
