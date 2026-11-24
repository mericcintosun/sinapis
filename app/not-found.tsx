import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-24 text-center">
      <h2 className="text-4xl text-ink">That dish is not on the menu</h2>
      <p className="text-ink/85">The link may point to a dish that was renamed or removed from the seed.</p>
      <Button asChild variant="cream">
        <Link href="/dishes">Browse all dishes</Link>
      </Button>
    </div>
  );
}
