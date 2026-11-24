"use client";

import Link from "next/link";
import { ErrorState } from "@/components/route-states";

export default function ActivityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="The change log did not load"
        hint="Nothing was written. Try again, and your stored supplier changes load back from this browser."
        onRetry={reset}
      />
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm text-ink underline decoration-line underline-offset-4">
        Back to the overview
      </Link>
    </div>
  );
}
