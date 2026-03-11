// Iteration: v1.0
// Location: GitHub -> utils/supabase/client.ts
// Purpose: Standard Supabase client for Browser-side operations

import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
