"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-24 text-center">
      <h2 className="text-4xl text-ink">The graph query broke</h2>
      <p className="text-ink/85">Nothing was written. Try again, and if it repeats, reset to the seed from the overview.</p>
      <Button variant="cream" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
