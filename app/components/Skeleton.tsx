// app/components/Skeleton.tsx
// Reusable skeleton loading primitives with pulse animation.
// Used throughout the dashboard to replace plain "Loading..." text.
'use client'

/** Base animated bar — accepts Tailwind classes for width/height/rounding. */
export function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200 rounded animate-pulse ${className}`}
      style={{ minHeight: '0.75rem' }}
    />
  )
}

/** A full-page skeleton with header bar + content placeholders. */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#EAEAEE', fontFamily: 'Arial, sans-serif' }}>
      {/* Header placeholder */}
      <div style={{ backgroundColor: '#00426A', borderBottom: '4px solid #0077C8', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <div className="w-9 h-9 rounded bg-white/20 animate-pulse" />
        <div className="w-28 h-4 rounded bg-white/20 animate-pulse" />
      </div>

      {/* Content area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title area */}
        <div className="space-y-2">
          <SkeletonBar className="h-3 w-32" />
          <SkeletonBar className="h-6 w-64" />
        </div>

        {/* Card skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100">
            <SkeletonBar className="h-3 w-40" />
          </div>
          <div className="px-8 py-6 space-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <SkeletonBar className="h-4 w-4 rounded-full flex-shrink-0" />
                <SkeletonBar className={`h-4 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Section-level skeleton for card interiors (replaces "Loading..." in admin sections). */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="px-5 sm:px-8 py-8 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonBar className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className={`h-4 ${i % 3 === 0 ? 'w-2/3' : i % 3 === 1 ? 'w-1/2' : 'w-3/4'}`} />
            <SkeletonBar className="h-3 w-1/3" />
          </div>
          <SkeletonBar className="h-6 w-16 rounded-lg flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Table-shaped skeleton with rows and columns. */
export function TableSkeleton({ rows = 4, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="px-5 sm:px-8 py-6 space-y-3">
      {/* Header row */}
      <div className="flex gap-6 pb-3 border-b border-slate-100">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBar key={i} className="h-3 w-24" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-6 py-2">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBar key={j} className={`h-4 ${j === 0 ? 'w-32' : 'w-20'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
