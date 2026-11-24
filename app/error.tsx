"use client";

import { ErrorState } from "@/components/route-states";

// Route error surface for the overview. It never prints the error message or stack: a
// judge or a guest-facing waiter only needs to know nothing was written and how to retry.
export default function OverviewError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="The matrix did not load"
        hint="Nothing was written. Try again, and if it repeats, open /?reset=1 to return to the seed."
        onRetry={reset}
      />
    </div>
  );
}
