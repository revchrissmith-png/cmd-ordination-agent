// Iteration: v1.5 - The "Where are my variables?" Diagnostic
'use client'

export default function DiagnosticPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-10 font-mono">
      <h1 className="text-2xl font-bold mb-4">System Diagnostic</h1>
      <div className="space-y-2">
        <p>URL Present: {url ? "✅ YES" : "❌ NO"}</p>
        <p>Key Present: {key ? "✅ YES" : "❌ NO"}</p>
      </div>
      
      {!url || !key ? (
        <div className="mt-8 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
          <strong>Action Required:</strong> Your Environment Variables are missing in Vercel. 
          Go to Settings -> Environment Variables and ensure they are set for "Preview" and "Production".
        </div>
      ) : (
        <p className="mt-8 text-green-600 font-bold">Variables are loaded. Refreshing session...</p>
      )}
    </div>
  )
}
