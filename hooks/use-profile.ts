// Iteration: v1.7
// Location: hooks/use-profile.ts
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase/client'

export type UserRole = 'ordinand' | 'admin'

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Function to fetch profile
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data as Profile)
      }
      setLoading(false)
    }

    // 2. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        // If no session, don't stop loading yet—wait for the state change listener
        // unless we know for sure there's no hash in the URL
        if (!window.location.hash) {
          setLoading(false)
        }
      }
    })

    // 3. Listen for the login event (This catches the Magic Link "handshake")
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { 
    profile, 
    loading, 
    isAdmin: profile?.role === 'admin',
    isOrdinand: profile?.role === 'ordinand' 
  }
}
