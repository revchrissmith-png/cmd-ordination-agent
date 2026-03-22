// Iteration: v2.0 - Cookie-based session storage
// Uses @supabase/ssr's createBrowserClient so the session is stored in cookies
// rather than localStorage. This is required for the Edge middleware to be able
// to read the session and protect /dashboard and /handbook routes server-side.
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
