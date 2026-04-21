// app/dashboard/layout.tsx
// Provides the consistent layout for all pages inside /dashboard

import React from 'react'
import NavBar from '../components/NavBar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="py-6">
        {children}
      </div>
    </div>
  )
}
