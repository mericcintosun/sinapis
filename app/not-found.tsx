import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="sinapis-rise mx-auto grid max-w-4xl items-center gap-8 py-16 md:grid-cols-[1fr_16rem]">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink/90">Sinapis</p>
        <h1 className="text-4xl text-ink">That dish is not on the menu</h1>
        <p className="text-ink">The link may point to a dish that was renamed or removed from the seed.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="cream">
            <Link href="/dishes">Browse all dishes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the overview</Link>
          </Button>
        </div>
      </div>
      <div className="mx-auto w-48 overflow-hidden rounded-md md:w-full">
        <SceneSlot n={6}
          alt="An empty cream plate with a fork and knife laid across it on a kiln-black counter"
          width={480}
          height={520}
        />
      </div>
    </div>
  );
}
