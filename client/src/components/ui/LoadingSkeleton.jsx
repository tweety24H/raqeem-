// Shimmer skeleton block — see `.skeleton-shimmer` in index.css for the
// animation itself (respects prefers-reduced-motion there).
export function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
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
