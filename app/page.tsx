import type { Metadata } from "next";
import Link from "next/link";
import { OverviewBoard } from "@/components/overview-board";
import { SceneSlot } from "@/components/scene-slot";
import { seedKitchen } from "@/lib/data";

export const metadata: Metadata = { title: "Overview" };

// The DEMO.md walk as plain text links. Every href resolves to an existing route file:
// app/page.tsx, app/dishes/[id]/page.tsx, app/activity/page.tsx, app/dishes/page.tsx.
const TRY_STEPS = [
  { href: "/#matrix", label: "Read the matrix: 16 dishes by the 14 EU allergens." },
  { href: "/dishes/grilled-sea-bass?allergen=MUS", label: "Open Grilled sea bass by Mustard to see the path behind the cell." },
  { href: "/activity#log-change", label: "Log the tahini change: Stone-ground tahini may now contain Peanuts. Preview, then Apply." },
  { href: "/dishes", label: "Check a guest: pick Sesame and Celery on the Dishes page." },
  { href: "/dishes/lamb-shish?allergen=PNT", label: "After Apply, open Lamb shish by Peanuts to watch the path graph draw the chain." },
];

// Overview: the app shell's welcome state, built from the seed. No marketing hero;
// the rail holds the only call to action (Log supplier change).
export default function OverviewPage() {
  const k = seedKitchen;
  const unknownSpecs = k.products.filter((p) => !p.specKnown);

  return (
    <div className="sinapis-rise-group mx-auto max-w-6xl space-y-8">
      <section className="sinapis-rise grid items-center gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink/90">
            {k.restaurant.name}, {k.restaurant.city}
          </p>
          <h1 className="text-4xl text-ink md:text-5xl">
            {k.dishes.length} dishes, {k.allergens.length} allergens, {k.products.length} supplier products
          </h1>
          <p className="text-lg leading-relaxed text-ink">
            Every flag below is a path from a dish to the supplier product that declared it.
          </p>
          <p className="text-sm text-ink/90">
            Chef {k.restaurant.chef}&apos;s kitchen: {k.subRecipes.length} sub-recipes, {k.suppliers.length} suppliers,{" "}
            {unknownSpecs.length} {unknownSpecs.length === 1 ? "product" : "products"} without a spec sheet (
            {unknownSpecs.map((p) => p.name).join(", ")}).
          </p>
          <details className="group rounded-md bg-card text-card-foreground">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 text-sm font-semibold">
              The 90 second walk, five clicks
              <span aria-hidden className="text-kiln/70 group-open:hidden">Show</span>
              <span aria-hidden className="hidden text-kiln/70 group-open:inline">Hide</span>
            </summary>
            <ol className="list-decimal space-y-0.5 px-4 pb-4 pl-9 text-sm">
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
          </details>
        </div>
        <div className="hidden overflow-hidden rounded-md sm:block">
          <SceneSlot n={1}
            alt="A chef at a steel pass reading a supplier's spec sheet next to a menu card with dishes ticked in red"
            width={960}
            height={640}
          />
        </div>
      </section>

      <OverviewBoard />
    </div>
  );
}
