"use client";

import { ErrorState } from "@/components/route-states";

export default function DishesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="The menu did not load"
        hint="Nothing was written. Try again to reload the dish list and the guest check."
        onRetry={reset}
      />
    </div>
  );
}
