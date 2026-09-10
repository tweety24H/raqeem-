// Shimmer skeleton block — animated gradient sweep (see the `shimmer`
// keyframes/animation in tailwind.config.js). motion-reduce: freezes the
// sweep for prefers-reduced-motion without needing custom CSS.
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`animate-shimmer motion-reduce:animate-none rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 ${className}`}
    />
  );
}

// A row of stat-card-shaped skeletons, sized to match StatCard.
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// A grid of section-card-shaped skeletons, sized to match Card.
export function SectionCardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card space-y-3">
          <SkeletonBlock className="h-10 w-10" />
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
