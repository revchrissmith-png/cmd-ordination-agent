// app/eval/error.tsx
// Next.js error boundary for the public evaluation form.
'use client'

export default function EvalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-10 max-w-md text-center">
        <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
        <h2 className="text-lg font-black text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
          We encountered an error loading this page. Your evaluation responses have not been lost if you were mid-form.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#00426A] text-white rounded-xl text-sm font-bold hover:bg-[#003558] transition-all"
        >
          Try Again
        </button>
        {error.digest && (
          <p className="text-xs text-slate-300 font-medium mt-6">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
