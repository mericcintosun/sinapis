import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink/75">Sinapis</p>
      <h1 className="text-4xl text-ink">That dish is not on the menu</h1>
      <p className="text-ink/85">The link may point to a dish that was renamed or removed from the seed.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="cream">
          <Link href="/dishes">Browse all dishes</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the overview</Link>
        </Button>
      </div>
    </div>
  );
}
