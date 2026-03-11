// Iteration: v1.5
// Location: GitHub -> hooks/use-profile.ts
// Purpose: Handle partial profiles (email only) without crashing.

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
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
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
        } else if (error && user) {
          // If no profile exists yet, create a temporary one for the UI
          setProfile({
            id: user.id,
            email: user.email || '',
            first_name: 'New',
            last_name: 'User',
            role: 'ordinand' // Default fallback
          })
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
