// middleware.ts
// Server-side route protection using @supabase/ssr.
// Runs at the Edge before any page or API route is rendered.
// Redirects unauthenticated requests for /dashboard and /handbook to the login page.
// Public routes (/eval, /api, /auth) are intentionally left unguarded here —
// the eval form is token-gated, and API routes handle their own auth checks.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Build a mutable response so the Supabase client can refresh cookies if needed
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
          // First write the new cookie values onto the request so
          // downstream server components see the refreshed session
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Then rebuild the response so the updated cookies are sent
          // back to the browser
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the session with the Supabase server — it is the
  // authoritative check. getSession() alone only reads the local cookie and
  // should not be trusted for access control decisions.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect every route under /dashboard and /handbook
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/handbook')

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/'
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
