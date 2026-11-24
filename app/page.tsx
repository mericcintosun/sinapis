import type { Metadata } from "next";
import Link from "next/link";
import { OverviewBoard } from "@/components/overview-board";
import { SceneSlot } from "@/components/scene-slot";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seedKitchen } from "@/lib/data";

export const metadata: Metadata = { title: "Overview" };

// The DEMO.md walk as plain text links. Every href resolves to an existing route file:
// app/page.tsx, app/dishes/[id]/page.tsx, app/activity/page.tsx, app/dishes/page.tsx.
const TRY_STEPS = [
  { href: "/#matrix", label: "Read the matrix below: 16 dishes by the 14 EU allergens." },
  { href: "/dishes/grilled-sea-bass?allergen=MUS", label: "Click a cell, for example Grilled sea bass by Mustard, to see the path behind it." },
  { href: "/activity#log-change", label: "Log the tahini change: Stone-ground tahini may now contain Peanuts. Preview, then Apply." },
  { href: "/dishes", label: "Check a guest: pick Sesame and Celery on the Dishes page." },
  { href: "/dishes/lamb-shish?allergen=PNT", label: "After Apply, open Lamb shish by Peanuts to see the path graph draw the chain." },
];

// Overview: the app shell's welcome state, built from the seed. No marketing hero;
// the rail holds the only call to action (Log supplier change).
export default function OverviewPage() {
  const k = seedKitchen;
  const unknownSpecs = k.products.filter((p) => !p.specKnown);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="sinapis-rise-group grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="sinapis-rise space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink/75">
            {k.restaurant.name}, {k.restaurant.city}
          </p>
          <h1 className="text-4xl leading-tight text-ink md:text-5xl">
            Every allergen on your menu, traced back to the jar it came from.
          </h1>
          <p className="max-w-[66ch] text-lg leading-relaxed text-ink/90">
            Chef {k.restaurant.chef} runs {k.dishes.length} dishes through {k.subRecipes.length} sub-recipes and{" "}
            {k.products.length} supplier products from {k.suppliers.length} suppliers. Sinapis keeps them as one graph,
            so a mustard flag on the sea bass comes with the sauce and the mayonnaise that put it there. Right now{" "}
            {unknownSpecs.length} product ({unknownSpecs.map((p) => p.name).join(", ")}) has no spec sheet, and every
            dish that touches it stays flagged until one arrives.
          </p>
        </div>
        <div className="sinapis-rise overflow-hidden rounded-md">
          <SceneSlot
            n={1}
            alt="A chef at a steel pass reading a supplier's spec sheet next to a menu card with dishes ticked in red"
            width={960}
            height={640}
          />
        </div>
      </section>

      <Card className="sinapis-rise">
        <CardHeader>
          <CardTitle>Try it in 90 seconds</CardTitle>
          <CardDescription className="max-w-[68ch]">
            Built for a chef running a small restaurant kitchen. Sinapis is decision support, not a medical guarantee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {TRY_STEPS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="inline-flex min-h-11 items-center underline decoration-kiln/25 underline-offset-4 hover:decoration-kiln"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <OverviewBoard />
    </div>
  );
}
