import * as React from "react";
import { cn } from "@/lib/utils";

// Placeholder bar for loading states: a flat tone, no shimmer, no extra keyframes.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("rounded-md bg-kiln/10", className)} {...props} />;
}

// Placeholder bar sitting directly on the terracotta block.
function BlockSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("rounded-md bg-surface", className)} {...props} />;
}

// The page skeleton every loading.tsx shares: a headline on the block, then cream cards.
function PageSkeleton({ label, cards = 2, wide = false }: { label: string; cards?: number; wide?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={cn("sinapis-rise mx-auto space-y-8", wide ? "max-w-6xl" : "max-w-5xl")}>
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <BlockSkeleton className="h-4 w-40 max-w-full" />
        <BlockSkeleton className="h-12 w-full max-w-2xl" />
        <BlockSkeleton className="h-5 w-full max-w-xl" />
      </div>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="space-y-3 rounded-md bg-card p-5">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, BlockSkeleton, PageSkeleton };
