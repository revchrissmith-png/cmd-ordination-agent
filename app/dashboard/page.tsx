// Iteration: v1.7 - Diagnostic with Correct Imports
'use client'
import { supabase } from '../../utils/supabase/client' // Corrected path

export default function DiagnosticPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-10 font-mono max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 border-b pb-2">System Diagnostic</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded border">
          <p className="font-bold text-sm text-gray-500 uppercase">Supabase URL</p>
          <p className={url ? "text-green-600" : "text-red-600 font-bold"}>
            {url ? "✅ LOADED" : "❌ MISSING"}
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded border">
          <p className="font-bold text-sm text-gray-500 uppercase">Supabase Key</p>
          <p className={key ? "text-green-600" : "text-red-600 font-bold"}>
            {key ? "✅ LOADED" : "❌ MISSING"}
          </p>
        </div>
      </div>
      
      {!url || !key ? (
        <div className="mt-8 p-6 bg-red-50 text-red-700 border border-red-200 rounded-xl">
          <h2 className="font-bold">Missing Environment Variables</h2>
          <p className="text-sm mt-2">The build succeeded, but the app can't talk to the database. Please add the keys to Vercel Settings.</p>
        </div>
      ) : (
        <div className="mt-8 p-6 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-center">
          <p className="font-bold">Database Connection Ready</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
          >
            Go to Login Page
          </button>
        </div>
      )}
    </div>
  )
}
