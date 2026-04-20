// app/dashboard/error.tsx
// Next.js error boundary for all /dashboard/* routes.
// Catches unhandled errors and renders recovery UI without crashing the entire app.
'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAEAEE', fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-10 max-w-md text-center">
        <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
        <h2 className="text-lg font-black text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred. Your data is safe.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
          >
            Back to Dashboard
          </a>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-300 font-medium mt-6">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
