import { Skeleton } from "@/components/ui/skeleton";

/** Full-page loading skeleton shown while lazy-loaded routes are resolving */
export function PageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Card-sized loading skeleton for individual widgets */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 space-y-3 ${className ?? ""}`}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Table loading skeleton */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border px-4 py-3 flex gap-4 last:border-0">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
