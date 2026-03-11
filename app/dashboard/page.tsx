// Iteration: v1.6 - The "Where are my variables?" Diagnostic (Fixed)
'use client'

export default function DiagnosticPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-10 font-mono">
      <h1 className="text-2xl font-bold mb-4 border-b pb-2">System Diagnostic</h1>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded border">
          <p className="font-bold">Supabase URL Status:</p>
          <p className={url ? "text-green-600" : "text-red-600 font-bold"}>
            {url ? "✅ LOADED" : "❌ MISSING (URL is undefined)"}
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded border">
          <p className="font-bold">Supabase Key Status:</p>
          <p className={key ? "text-green-600" : "text-red-600 font-bold"}>
            {key ? "✅ LOADED" : "❌ MISSING (Key is undefined)"}
          </p>
        </div>
      </div>
      
      {!url || !key ? (
        <div className="mt-8 p-6 bg-red-100 text-red-700 border border-red-300 rounded-xl shadow-lg">
          <h2 className="font-bold text-lg mb-2">CRITICAL ACTION REQUIRED</h2>
          <p className="mb-4">Vercel cannot find your database connection info.</p>
          <ol className="list-decimal ml-5 space-y-1 text-sm">
            <li>Go to Vercel Dashboard</li>
            <li>Open Settings</li>
            <li>Select Environment Variables</li>
            <li>Check that NEXT_PUBLIC_SUPABASE_URL is exactly correct</li>
            <li>Check that NEXT_PUBLIC_SUPABASE_ANON_KEY is exactly correct</li>
          </ol>
        </div>
      ) : (
        <div className="mt-8 p-6 bg-green-100 text-green-700 border border-green-300 rounded-xl">
          <p className="font-bold">✅ Variables are found!</p>
          <p className="text-sm mt-1">If the screen is still blank, the issue is likely in the Supabase "Site URL" redirect settings.</p>
        </div>
      )}
    </div>
  )
}
