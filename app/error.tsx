"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Route error surface. It never prints the error message or stack: a judge or a
// guest-facing waiter only needs to know nothing was written and how to retry.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink/75">Sinapis</p>
      <h1 className="text-4xl text-ink">The graph query broke</h1>
      <p className="text-ink/85">Nothing was written. Try again, and if it repeats, reset to the seed from the overview.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="cream" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the overview</Link>
        </Button>
      </div>
    </div>
  );
}
