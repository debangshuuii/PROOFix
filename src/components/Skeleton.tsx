import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-800/80 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-2/3" />
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
