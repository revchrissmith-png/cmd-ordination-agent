// app/components/UploadProgress.tsx
// Indeterminate upload progress bar for file uploads.
// Shows animated stripe + file name being uploaded.
'use client'

interface UploadProgressProps {
  fileName?: string
  message?: string
}

export default function UploadProgress({ fileName, message = 'Uploading...' }: UploadProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-4 w-4 text-teal-600 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-bold text-teal-700">{message}</span>
      </div>
      {fileName && (
        <p className="text-xs text-slate-500 font-medium truncate pl-6">{fileName}</p>
      )}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full"
          style={{
            width: '40%',
            animation: 'indeterminate 1.5s ease-in-out infinite',
          }}
        />
      </div>
      <style jsx>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); width: 40%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(300%); width: 40%; }
        }
      `}</style>
    </div>
  )
}
