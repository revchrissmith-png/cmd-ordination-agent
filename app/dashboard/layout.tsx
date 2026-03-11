// Iteration: v1.0
// Location: GitHub -> app/dashboard/layout.tsx
// Purpose: Provides the consistent layout for all pages inside /dashboard

import React from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b px-8 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="font-bold text-blue-900 tracking-tight">CMD Ordination Portal</span>
          <div className="flex gap-4 text-sm font-medium text-gray-600">
             {/* We can add logout or profile links here later */}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="py-6">
        {children}
      </div>
    </div>
  )
}
