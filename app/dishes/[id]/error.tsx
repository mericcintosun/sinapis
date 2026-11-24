"use client";

import { ErrorState } from "@/components/route-states";

export default function DishError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="The paths for this dish did not load"
        hint="Nothing was written. Try again to walk the graph from this dish once more."
        onRetry={reset}
      />
    </div>
  );
}
