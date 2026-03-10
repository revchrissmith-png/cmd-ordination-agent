// Iteration: v1.1
// Location: GitHub -> hooks/use-profile.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'

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
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (!error && data) {
          setProfile(data as Profile)
        }
      }
      setLoading(false)
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
