// Iteration: v1.4
// Location: GitHub -> hooks/use-profile.ts
// Purpose: More robust error handling to prevent blank screens

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
    async function getProfile() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          setProfile(data as Profile)
        }
      } catch (err) {
        console.error("Profile hook error:", err)
      } finally {
        setLoading(false)
      }
    }

    getProfile()
  }, [])

  return { 
    profile, 
    loading, 
    isAdmin: profile?.role === 'admin',
    isOrdinand: profile?.role === 'ordinand' 
  }
}
