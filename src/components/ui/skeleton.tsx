import { cn } from '@/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-brand-100 rounded-lg', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-1.5 w-full" />
    </div>
  )
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
