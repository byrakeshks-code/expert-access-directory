'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-shimmer rounded-lg', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-surface-elevated border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function ExpertCardSkeleton() {
  return (
    <div className="bg-surface-elevated border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-surface-elevated border border-border rounded-xl">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
