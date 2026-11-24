"use client";

import { ErrorState } from "@/components/route-states";

export default function ActivityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="The change log did not load"
        hint="Nothing was written. Try again, and your stored supplier changes load back from this browser."
        onRetry={reset}
      />
    </div>
  );
}
