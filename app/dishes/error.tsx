"use client";

import Link from "next/link";
import { ErrorState } from "@/components/route-states";

export default function DishesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="The menu did not load"
        hint="Nothing was written. Try again to reload the dish list and the guest check."
        onRetry={reset}
      />
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm text-ink underline decoration-line underline-offset-4">
        Back to the overview
      </Link>
    </div>
  );
}
