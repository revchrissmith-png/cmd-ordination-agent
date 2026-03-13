// app/dashboard/admin/candidate/[id]/page.tsx
// Redirects to the canonical candidates path
'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CandidatePageRedirect() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    if (params?.id) {
      router.replace(`/dashboard/admin/candidates/${params.id}`)
    }
  }, [params, router])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 font-medium">Redirecting...</p>
    </main>
  )
}
